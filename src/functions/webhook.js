const {Octokit} = require("@octokit/rest");

const handler = async (event, context) => {
    const method = event.httpMethod;
    if (method !== 'POST') {
        return {statusCode: 403}
    }
    const payload = JSON.parse(event.body);
    if (payload.action !== 'opened' && payload.action !== 'reopened') {
        return {statusCode: 201}
    }
    const octokit = new Octokit({auth: process.env.NETLIFY_WEBHOOK_GITHUB_TOKEN});
    const base = payload.pull_request.base;
    const owner = base.repo.owner.login;
    const repo = base.repo.name;
    const number = payload.number

    console.log(await octokit.rest.pulls.listFiles({
        owner: owner,
        repo: repo,
        pull_number: number,
    }));

    await octokit.rest.issues.createComment({
        owner: owner,
        repo: repo,
        issue_number: number,
        body: 'Hello world'
    });
    return {
        statusCode: 200,
        body: '<html><body><h1>Hello world!</h1></body></html>'
    };
}

module.exports = {
    handler: handler
}
