const {has_starred_repo} = require("../src/checks");

test('has starred repo', async () => {
    const fixture = {data: [{login: 'robvanderleek'}]};
    const ocktokit = {rest: {activity: {listStargazersForRepo: () => (fixture)}}};

    let result = await has_starred_repo(ocktokit, 'robvanderleek');

    expect(result).toBeTruthy();

    result = await has_starred_repo(ocktokit, 'someoneelse');

    expect(result).toBeFalsy();
});