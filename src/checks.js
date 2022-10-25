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

async function below_max_size_and_file_count(octokit, owner, repo, path, max_size, max_file_count) {
    let size = 0;
    let files = 0;
    const {data: homeFolderData} = await octokit.rest.repos.getContent({
        owner: owner, repo: repo, path: path
    });
    for (const entry of homeFolderData) {
        if (entry.type === 'file') {
            files++;
            size += entry.size;
            if (files > max_file_count || size > max_size) {
                return false;
            }
        } else if (entry.type === 'dir') {
            const {data: subFolderData} = await octokit.rest.git.getTree({
                owner: owner, repo: repo, tree_sha: entry.sha, recursive: true
            });
            for (const entry of subFolderData.tree) {
                if (entry.type === 'blob') {
                    files++;
                    size += entry.size;
                    if (files > max_file_count || size > max_size) {
                        return false;
                    }
                }
            }
        }
    }
    return true;
}

module.exports = {
    has_starred_repo: has_starred_repo,
    contains_no_file_outside_user_home: contains_no_file_outside_user_home,
    below_max_size_and_file_count: below_max_size_and_file_count
}