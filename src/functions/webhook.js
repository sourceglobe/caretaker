const {Octokit} = require("@octokit/rest");
const {logger} = require("../logger");
const {has_starred_repo, contains_no_file_outside_user_home} = require("../checks");
const {OWNER, REPO} = require("../constants");

const handler = async (event, context) => {
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
    const number = payload.number

    const starred_repo = await has_starred_repo(octokit, user);
    const no_file_outside_user_home = await contains_no_file_outside_user_home(octokit, user, number);
    const comment =
        `You've starred the Sourceglobe repository: ${starred_repo ? '✅' : '❌'}
        No file outside /home/${user}: ${no_file_outside_user_home ? '✅' : '❌'}`;
    await add_comment(octokit, number, comment);
    await octokit.rest.pulls.update({owner: OWNER, repo: REPO, pull_number: number, state: 'closed'});
    return {
        statusCode: 200,
        body: '<html><body><h1>Hello world!</h1></body></html>'
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

module.exports = {
    OWNER: 'hello',
    REPO: REPO,
    handler: handler
}
