// Builds the read-only (list/retrieve) resource namespaces on a MetronClient.
// `credit` and `variant` are omitted: the API only exposes create/update
// operations for them, no list or retrieve endpoints to wrap.
function listResource(client, basePath, { retrieve = true } = {}) {
  const res = {
    list: (params = {}) => client.request(basePath, params),
    listAll: (params = {}) => client.paginate(basePath, params),
  };
  if (retrieve) {
    res.get = (id) => client.request(`${basePath}${id}/`);
  }
  return res;
}

function attachSubList(res, client, basePath, subPath, name) {
  res[name] = (id, params = {}) => client.request(`${basePath}${id}/${subPath}/`, params);
  res[`${name}All`] = (id, params = {}) => client.paginate(`${basePath}${id}/${subPath}/`, params);
}

export function buildResources(client) {
  const arc = listResource(client, '/api/arc/');
  attachSubList(arc, client, '/api/arc/', 'issue_list', 'issueList');

  const character = listResource(client, '/api/character/');
  attachSubList(character, client, '/api/character/', 'issue_list', 'issueList');

  const creator = listResource(client, '/api/creator/');
  const imprint = listResource(client, '/api/imprint/');
  const issue = listResource(client, '/api/issue/');

  const publisher = listResource(client, '/api/publisher/');
  attachSubList(publisher, client, '/api/publisher/', 'series_list', 'seriesList');

  const role = listResource(client, '/api/role/', { retrieve: false });

  const series = listResource(client, '/api/series/');
  attachSubList(series, client, '/api/series/', 'issue_list', 'issueList');

  const seriesType = listResource(client, '/api/series_type/', { retrieve: false });

  const team = listResource(client, '/api/team/');
  attachSubList(team, client, '/api/team/', 'issue_list', 'issueList');

  const universe = listResource(client, '/api/universe/');

  return {
    arc,
    character,
    creator,
    imprint,
    issue,
    publisher,
    role,
    series,
    seriesType,
    team,
    universe,
  };
}
