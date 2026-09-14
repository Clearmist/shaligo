// Builds the read-only (list/retrieve) resource namespaces on a MetronClient.
// `credit` and `variant` are omitted: the API only exposes create/update
// operations for them, no list or retrieve endpoints to wrap.
//
// The factories below are intentionally untyped/generic at runtime — every
// resource shares the same list/get/sub-list mechanics. The precise,
// resource-specific public types (query params, summary vs. detail shapes)
// live in src/types.js and are applied via `@type` casts where each
// resource is assigned onto MetronClient in src/client.js, since a single
// shared implementation can't be inferred into 11 distinct signatures.

/**
 * @typedef {object} RequestClient
 * @property {(path: string, params?: any, options?: import('./client.js').RequestOptions) => Promise<any>} request
 * @property {(path: string, params?: any, options?: import('./client.js').RequestOptions) => AsyncGenerator<any>} paginate
 */

/**
 * @param {RequestClient} client
 * @param {string} basePath
 * @param {{retrieve?: boolean}} [options]
 * @returns {Record<string, any>}
 */
function listResource(client, basePath, { retrieve = true } = {}) {
  /** @type {Record<string, any>} */
  const res = {
    list: (params = {}, options = {}) => client.request(basePath, params, options),
    listAll: (params = {}, options = {}) => client.paginate(basePath, params, options),
  };
  if (retrieve) {
    res.get = (/** @type {number} */ id, options = {}) => client.request(`${basePath}${id}/`, {}, options);
  }
  return res;
}

/**
 * @param {Record<string, any>} res
 * @param {RequestClient} client
 * @param {string} basePath
 * @param {string} subPath
 * @param {string} name
 */
function attachSubList(res, client, basePath, subPath, name) {
  res[name] = (/** @type {number} */ id, params = {}, options = {}) => client.request(`${basePath}${id}/${subPath}/`, params, options);
  res[`${name}All`] = (/** @type {number} */ id, params = {}, options = {}) => client.paginate(`${basePath}${id}/${subPath}/`, params, options);
}

/**
 * @param {RequestClient} client
 * @returns {Record<string, any>}
 */
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
