const {OWNER, REPO} = require("./constants");

async function has_starred_repo(octokit, user) {
    const {data: stargazers} = await octokit.rest.activity.listStargazersForRepo({
        owner: OWNER,
        repo: REPO,
        per_page: 100
    });
    return stargazers.map(sg => sg.login).includes(user);
}

async function contains_no_file_outside_user_home(octokit, user, pull_number) {
    const {data: files} = await octokit.rest.pulls.listFiles({
        owner: OWNER,
        repo: REPO,
        pull_number: pull_number,
    });
    return files.map(f => f.filename).find(n => !n.startsWith(`home/${user}/`)) === undefined;
}

module.exports = {
    has_starred_repo: has_starred_repo,
    contains_no_file_outside_user_home: contains_no_file_outside_user_home
}