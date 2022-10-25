const {OWNER, REPO} = require("./constants");

async function add_comment(octokit, pull_number, comment) {
    await octokit.rest.issues.createComment({
        owner: OWNER, repo: REPO, issue_number: pull_number, body: comment
    });
}

async function close_pull_request(octokit, pull_number) {
    await octokit.rest.pulls.update({owner: OWNER, repo: REPO, pull_number: pull_number, state: 'closed'});
}

async function merge_pull_request(octokit, pull_number) {
    await octokit.rest.pulls.merge({owner: OWNER, repo: REPO, pull_number: pull_number});
}

async function update_stats_gist(octokit, login, user) {
    const {data: gist} = await octokit.rest.gists.get({gist_id: 'b744ce6d70adc12aa958080702868826'});
    const users = JSON.parse(gist.files['users.json'].content);
    if (!users.includes(login)) {
        users.push(login);
        const newest = JSON.parse(gist.files['newest.json'].content);
        newest.unshift({login: login, avatar_url: user.avatar_url, since: Date.now()});
        const newest_update = newest.slice(0, 100);
        await octokit.rest.gists.update({
            gist_id: 'b744ce6d70adc12aa958080702868826', files: {
                'totals.json': {content: `{"users": ${users.length}}`},
                'users.json': {content: JSON.stringify(users)},
                'newest.json': {content: JSON.stringify(newest_update)}
            }
        });
    }
}

module.exports = {
    add_comment: add_comment,
    close_pull_request: close_pull_request,
    merge_pull_request: merge_pull_request,
    update_stats_gist: update_stats_gist
}