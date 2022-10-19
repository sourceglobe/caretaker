const {Octokit} = require("@octokit/rest");
const {logger} = require("../logger");
const {has_starred_repo, contains_no_file_outside_user_home} = require("../checks");
const {OWNER, REPO} = require("../constants");

const handler = async (event, _) => {
    const method = event.httpMethod;
    if (method !== 'POST') {
        return {statusCode: 403}
    }
    const payload = JSON.parse(event.body);
    const action = payload.action;
    if (action !== 'opened' && action !== 'reopened') {
        return {statusCode: 201}
    }
    const user = payload.pull_request.user.login;
    logger.info(`Received action: ${action} for user: ${user}`);
    const octokit = new Octokit({auth: process.env.NETLIFY_WEBHOOK_GITHUB_TOKEN});
    const pull_number = payload.number
    const starred_repo = await has_starred_repo(octokit, user);
    const no_file_outside_user_home = await contains_no_file_outside_user_home(octokit, user, pull_number);
    const comment =
        `You've starred the Sourceglobe repository: ${starred_repo ? '✅' : '❌'}
        No file outside /home/${user}: ${no_file_outside_user_home ? '✅' : '❌'}`;
    await add_comment(octokit, pull_number, comment);
    if (starred_repo && no_file_outside_user_home) {
        logger.info(`All checks pass ✅, merging pull request #${pull_number} for user: ${user}`);
        await merge_pull_request(octokit, pull_number);
    } else {
        logger.info(`Failed checks ❌, closing pull request #${pull_number} for user: ${user}`);
        await close_pull_request(octokit, pull_number);
    }
    return {
        statusCode: 200
    };
}

async function add_comment(octokit, pull_number, comment) {
    await octokit.rest.issues.createComment({
        owner: OWNER,
        repo: REPO,
        issue_number: pull_number,
        body: comment
    });
}

async function close_pull_request(octokit, pull_number) {
    await octokit.rest.pulls.update({owner: OWNER, repo: REPO, pull_number: pull_number, state: 'closed'});
}

async function merge_pull_request(octokit, pull_number) {
    await octokit.rest.pulls.merge({owner: OWNER, repo: REPO, pull_number: pull_number});
}

module.exports = {
    OWNER: 'hello',
    REPO: REPO,
    handler: handler
}
