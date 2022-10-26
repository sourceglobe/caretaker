const {Octokit} = require("@octokit/rest");
const {logger} = require("../logger");
const {has_starred_repo, contains_no_file_outside_user_home, below_max_size_and_file_count} = require("../checks");
const {add_comment, merge_pull_request, update_stats_gist, close_pull_request} = require("../github");
const crypto = require("crypto");

const handler = async (event, _) => {
    if (!checkSecret(event)) {
        logger.warn('Payload digest is invalid!');
        return {statusCode: 401};
    }
    if (!checkMethod(event)) {
        return {statusCode: 403};
    }
    const payload = JSON.parse(event.body);
    if (!checkAction(payload.action)) {
        return {statusCode: 201};
    }

    const user = payload.pull_request.user;
    const login = user.login;
    logger.info(`Received action: ${payload.action} for user: ${login}`);
    const octokit = new Octokit({auth: process.env.NETLIFY_WEBHOOK_GITHUB_TOKEN});
    const pull_number = payload.number
    const starred_repo = await has_starred_repo(octokit, login);
    const no_file_outside_user_home = await contains_no_file_outside_user_home(octokit, login, pull_number);
    const headRepoOwner = payload.pull_request.head.repo.owner.login;
    const headRepoName = payload.pull_request.head.repo.name;
    const max_size_and_file_count = below_max_size_and_file_count(octokit, headRepoOwner, headRepoName, `home/${login}`, 1024 * 1024, 999);
    const comment = formatComment(login, starred_repo, no_file_outside_user_home, max_size_and_file_count);
    await add_comment(octokit, pull_number, comment);
    const allChecksPassed = starred_repo && no_file_outside_user_home && max_size_and_file_count;
    await handleChecksResult(allChecksPassed, octokit, pull_number, login, user);
    return {
        statusCode: 200
    };
}

function checkSecret(event) {
    const signature = Buffer.from(event.headers['x-hub-signature-256'], 'utf-8');
    const sha = crypto.createHmac('sha256', process.env.NETLIFY_WEBHOOK_SECRET).update(event.body).digest('hex');
    const digest = Buffer.from(`sha256=${sha}`, 'utf-8');
    return signature.length === digest.length && crypto.timingSafeEqual(digest, signature);
}

function checkMethod(event) {
    const method = event.httpMethod;
    return method === 'POST';
}

function checkAction(action) {
    return action === 'opened' || action === 'reopened';
}

function formatComment(login, starred_repo, no_file_outside_user_home, max_size_and_file_count) {
    let result = '';
    result += `Hi @${login} 👋\n\n`;
    result += 'Thanks for your pull-request!\m';
    result += 'Let me run just a few checks before merging...\n\n';
    if (starred_repo) {
        result += '✅  You\'ve starred the Sourceglobe repository\n';
    } else {
        result += '❌  You forgot to star the Sourceglobe repository\n';
    }
    if (no_file_outside_user_home) {
        result += `✅  No file outside /home/${login}\n`;
    } else {
        result += `❌  Found files outside /home/${login}\n`;
    }
    if (max_size_and_file_count) {
        result += '✅  Number of files < 1000 and total size < 1048576 bytes\n';
    } else {
        result += '❌  Number of files > 1000 or total size > 1048576 bytes\n';
    }
    result += '\n';
    if (starred_repo && no_file_outside_user_home && max_size_and_file_count) {
        result += 'That all looks great!\n'
        result += 'Let\'s merge that pull-request to the main branch 🚀\n';
    } else {
        result += 'Please fix the issues above and try again.\n'
        result += 'Closing the pull-request now, until next time!\n';
    }
    return result;
}

async function handleChecksResult(result, octokit, pull_number, login, user) {
    if (result) {
        logger.info(`All checks pass ✅, merging pull request #${pull_number} for user: ${login}`);
        await merge_pull_request(octokit, pull_number);
        await update_stats_gist(octokit, login, user);
    } else {
        logger.info(`Failed checks ❌, closing pull request #${pull_number} for user: ${login}`);
        await close_pull_request(octokit, pull_number);
    }
}

module.exports = {
    handler: handler
}
