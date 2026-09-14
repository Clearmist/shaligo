// JSDoc-only type definitions mirroring the read-only surface of the Metron
// OpenAPI schema (see "Metron Comicbook Database.yaml" in the repo root).
// This file has no runtime exports; `tsc --checkJs` uses it to type-check
// src/*.js and to emit the published .d.ts files.

/**
 * @template T
 * @typedef {object} Paginated
 * @property {number} count - Total number of matching records across all pages.
 * @property {string|null} next - URL of the next page, or null on the last page.
 * @property {string|null} previous - URL of the previous page, or null on the first page.
 * @property {T[]} results
 */

/** @typedef {{id: number, name: string}} PublisherRef */
/** @typedef {{id: number, name: string}} ImprintRef */
/** @typedef {{id: number, name: string}} RatingRef */
/** @typedef {{id: number, name: string}} Genre */
/** @typedef {{id: number, series: string}} AssociatedSeries */
/** @typedef {{id: number, issue: string}} Reprint */

/**
 * @typedef {object} RoleSummary
 * @property {number} id
 * @property {string} name
 */

/**
 * @typedef {object} SeriesTypeSummary
 * @property {number} id
 * @property {string} name
 */

/**
 * @typedef {object} Credit
 * @property {number} id
 * @property {string} creator - Creator's name.
 * @property {RoleSummary[]} role
 */

/**
 * @typedef {object} Variant
 * @property {string} [name]
 * @property {string|null} price - Decimal string, e.g. "3.99".
 * @property {string} [sku]
 * @property {string} [upc]
 * @property {string} image
 */

/**
 * @typedef {object} IssueSeriesRef
 * @property {number} id
 * @property {string} name
 * @property {string[]} [alt_names]
 * @property {string} sort_name
 * @property {number} volume
 * @property {number} year_began
 * @property {SeriesTypeSummary} series_type
 * @property {Genre[]} genres
 */

/**
 * @typedef {object} IssueListSeriesRef
 * @property {number} id
 * @property {string} name
 * @property {number} volume
 * @property {number} year_began
 */

// -- Arc ---------------------------------------------------------------

/**
 * @typedef {object} ArcSummary
 * @property {number} id
 * @property {string} name
 * @property {string} modified - ISO 8601 timestamp.
 */

/**
 * @typedef {object} ArcDetail
 * @property {number} id
 * @property {string} name
 * @property {string} [desc]
 * @property {string|null} [image]
 * @property {number|null} [cv_id] - Comic Vine ID.
 * @property {number|null} [gcd_id] - Grand Comics Database ID.
 * @property {string} resource_url
 * @property {string} modified - ISO 8601 timestamp.
 */

/**
 * @typedef {object} ArcParams
 * @property {number} [cv_id] - Comic Vine ID.
 * @property {number} [gcd_id] - Grand Comics Database ID.
 * @property {string} [modified_gt] - ISO 8601 datetime; return records modified after this.
 * @property {string} [name]
 * @property {number} [page]
 */

// -- Character -----------------------------------------------------------

/**
 * @typedef {object} CharacterSummary
 * @property {number} id
 * @property {string} name
 * @property {string} modified - ISO 8601 timestamp.
 */

/**
 * @typedef {object} CharacterDetail
 * @property {number} id
 * @property {string} name
 * @property {string[]} [alias]
 * @property {string} [desc]
 * @property {string|null} [image]
 * @property {CreatorSummary[]} creators
 * @property {TeamSummary[]} teams
 * @property {UniverseSummary[]} universes
 * @property {number|null} [cv_id] - Comic Vine ID.
 * @property {number|null} [gcd_id] - Grand Comics Database ID.
 * @property {string} resource_url
 * @property {string} modified - ISO 8601 timestamp.
 */

/** @typedef {ArcParams} CharacterParams */

// -- Creator ---------------------------------------------------------------

/**
 * @typedef {object} CreatorSummary
 * @property {number} id
 * @property {string} name
 * @property {string} modified - ISO 8601 timestamp.
 */

/**
 * @typedef {object} CreatorDetail
 * @property {number} id
 * @property {string} name
 * @property {string|null} [birth] - ISO 8601 date.
 * @property {string|null} [death] - ISO 8601 date.
 * @property {string} [desc]
 * @property {string|null} [image]
 * @property {string[]} [alias]
 * @property {number|null} [cv_id] - Comic Vine ID.
 * @property {number|null} [gcd_id] - Grand Comics Database ID.
 * @property {string} resource_url
 * @property {string} modified - ISO 8601 timestamp.
 */

/** @typedef {ArcParams} CreatorParams */

// -- Imprint -----------------------------------------------------------

/**
 * @typedef {object} ImprintSummary
 * @property {number} id
 * @property {string} name
 * @property {string} modified - ISO 8601 timestamp.
 */

/**
 * @typedef {object} ImprintDetail
 * @property {number} id
 * @property {string} name
 * @property {number|null} [founded]
 * @property {string} [desc]
 * @property {string|null} [image]
 * @property {number|null} [cv_id] - Comic Vine ID.
 * @property {number|null} [gcd_id] - Grand Comics Database ID.
 * @property {PublisherRef} publisher
 * @property {string} resource_url
 * @property {string} modified - ISO 8601 timestamp.
 */

/** @typedef {ArcParams} ImprintParams */

// -- Issue -----------------------------------------------------------

/**
 * @typedef {object} IssueSummary
 * @property {number} id
 * @property {IssueListSeriesRef} series
 * @property {string} number
 * @property {string} issue - Display title, e.g. "Batman (2016) #1".
 * @property {string} cover_date - ISO 8601 date.
 * @property {string|null} [store_date] - ISO 8601 date.
 * @property {string|null} [image]
 * @property {string} [cover_hash]
 * @property {string} modified - ISO 8601 timestamp.
 */

/**
 * @typedef {object} IssueDetail
 * @property {number} id
 * @property {PublisherRef} publisher
 * @property {ImprintRef} imprint
 * @property {IssueSeriesRef} series
 * @property {string} number
 * @property {string} [alt_number]
 * @property {string} [title]
 * @property {string[]} [name] - Story titles.
 * @property {string} cover_date - ISO 8601 date.
 * @property {string|null} [store_date] - ISO 8601 date.
 * @property {string|null} [foc_date] - ISO 8601 date; final order cutoff date.
 * @property {string|null} price - Decimal string, e.g. "3.99".
 * @property {string} price_currency
 * @property {RatingRef} rating
 * @property {string} [sku] - Distributor SKU.
 * @property {string} [isbn]
 * @property {string} [upc]
 * @property {number|null} [page] - Page count.
 * @property {string} [desc]
 * @property {string|null} [image]
 * @property {string} [cover_hash]
 * @property {number} average_rating
 * @property {number} rating_count
 * @property {ArcSummary[]} arcs
 * @property {Credit[]} credits
 * @property {CharacterSummary[]} characters
 * @property {TeamSummary[]} teams
 * @property {UniverseSummary[]} universes
 * @property {Reprint[]} reprints
 * @property {Variant[]} variants
 * @property {number|null} [cv_id] - Comic Vine ID.
 * @property {number|null} [gcd_id] - Grand Comics Database ID.
 * @property {string} resource_url
 * @property {string} modified - ISO 8601 timestamp.
 */

/**
 * @typedef {object} IssueParams
 * @property {string} [alt_number]
 * @property {number} [character_id] - Character Metron ID.
 * @property {string} [cover_hash]
 * @property {number} [cover_month]
 * @property {number} [cover_year]
 * @property {number} [creator_id] - Creator Metron ID.
 * @property {number} [cv_id] - Comic Vine ID.
 * @property {string} [foc_date] - ISO 8601 date.
 * @property {string} [foc_date_range_after] - ISO 8601 date.
 * @property {string} [foc_date_range_before] - ISO 8601 date.
 * @property {number} [gcd_id] - Grand Comics Database ID.
 * @property {number} [imprint_id] - Imprint Metron ID.
 * @property {string} [imprint_name]
 * @property {boolean} [missing_cv_id]
 * @property {boolean} [missing_gcd_id]
 * @property {string} [modified_gt] - ISO 8601 datetime; return records modified after this.
 * @property {string} [number] - Issue number.
 * @property {number} [page]
 * @property {number} [publisher_id] - Publisher Metron ID.
 * @property {string} [publisher_name]
 * @property {string} [rating]
 * @property {string} [role_id] - Comma-separated list of role IDs.
 * @property {string} [series_alt_names] - Series alternative name.
 * @property {number} [series_id] - Series Metron ID.
 * @property {string} [series_name]
 * @property {string} [series_q] - Quick search across series name and alternative names.
 * @property {number} [series_volume]
 * @property {number} [series_year_began]
 * @property {string} [sku] - Distributor SKU.
 * @property {string} [store_date] - ISO 8601 date.
 * @property {string} [store_date_range_after] - ISO 8601 date.
 * @property {string} [store_date_range_before] - ISO 8601 date.
 * @property {number} [team_id] - Team Metron ID.
 * @property {number} [universe_id] - Universe Metron ID.
 * @property {string} [upc] - UPC code.
 * @property {string} [upc_starts_with] - UPC code prefix (e.g. the 12-digit UPC-A a scanner reads after stripping the 5-digit EAN supplemental).
 */

// -- Publisher -----------------------------------------------------------

/**
 * @typedef {object} PublisherSummary
 * @property {number} id
 * @property {string} name
 * @property {string} modified - ISO 8601 timestamp.
 */

/**
 * @typedef {object} PublisherDetail
 * @property {number} id
 * @property {string} name
 * @property {number|null} [founded]
 * @property {string} [country] - ISO 3166-1 alpha-2 country code.
 * @property {string} [desc]
 * @property {string|null} [image]
 * @property {number|null} [cv_id] - Comic Vine ID.
 * @property {number|null} [gcd_id] - Grand Comics Database ID.
 * @property {string} resource_url
 * @property {string} modified - ISO 8601 timestamp.
 */

/** @typedef {ArcParams} PublisherParams */

// -- Role / SeriesType (list-only resources) ------------------------------

/** @typedef {{modified_gt?: string, name?: string, page?: number}} RoleParams */
/** @typedef {{modified_gt?: string, name?: string, page?: number}} SeriesTypeParams */

// -- Series -----------------------------------------------------------

/**
 * @typedef {object} SeriesSummary
 * @property {number} id
 * @property {string} series - Display name, e.g. "Batman (2016)".
 * @property {number} year_began
 * @property {number|null} [year_end]
 * @property {number} volume
 * @property {number} issue_count
 * @property {string} modified - ISO 8601 timestamp.
 */

/**
 * @typedef {object} SeriesDetail
 * @property {number} id
 * @property {string} name
 * @property {string} sort_name
 * @property {string[]} [alt_names]
 * @property {number} volume
 * @property {SeriesTypeSummary} series_type
 * @property {string} status - Human-readable status label (e.g. "Ongoing").
 * @property {PublisherRef} publisher
 * @property {ImprintRef} imprint
 * @property {number} year_began
 * @property {number|null} [year_end]
 * @property {string} [desc]
 * @property {number} issue_count
 * @property {Genre[]} genres
 * @property {AssociatedSeries[]} associated
 * @property {number|null} [cv_id] - Comic Vine ID.
 * @property {number|null} [gcd_id] - Grand Comics Database ID.
 * @property {string} resource_url
 * @property {string} modified - ISO 8601 timestamp.
 */

/**
 * @typedef {object} SeriesParams
 * @property {string} [alt_names]
 * @property {number} [character_id] - Character Metron ID.
 * @property {number} [creator_id] - Creator Metron ID.
 * @property {number} [cv_id] - Comic Vine ID.
 * @property {number} [gcd_id] - Grand Comics Database ID.
 * @property {number} [imprint_id] - Imprint Metron ID.
 * @property {string} [imprint_name]
 * @property {boolean} [missing_cv_id]
 * @property {boolean} [missing_gcd_id]
 * @property {string} [modified_gt] - ISO 8601 datetime; return records modified after this.
 * @property {string} [name]
 * @property {number} [page]
 * @property {number} [publisher_id]
 * @property {string} [publisher_name]
 * @property {string} [q] - Quick search across name and alternative names.
 * @property {string} [role_id] - Comma-separated list of role IDs.
 * @property {string} [series_type]
 * @property {number} [series_type_id]
 * @property {1|2|3|4} [status] - 1=Cancelled, 2=Completed, 3=Hiatus, 4=Ongoing.
 * @property {number} [team_id] - Team Metron ID.
 * @property {number} [universe_id] - Universe Metron ID.
 * @property {number} [volume]
 * @property {number} [year_began]
 * @property {number} [year_end]
 */

// -- Team -----------------------------------------------------------

/**
 * @typedef {object} TeamSummary
 * @property {number} id
 * @property {string} name
 * @property {string} modified - ISO 8601 timestamp.
 */

/**
 * @typedef {object} TeamDetail
 * @property {number} id
 * @property {string} name
 * @property {string} [desc]
 * @property {string|null} [image]
 * @property {CreatorSummary[]} creators
 * @property {UniverseSummary[]} universes
 * @property {number|null} [cv_id] - Comic Vine ID.
 * @property {number|null} [gcd_id] - Grand Comics Database ID.
 * @property {string} resource_url
 * @property {string} modified - ISO 8601 timestamp.
 */

/** @typedef {ArcParams} TeamParams */

// -- Universe -----------------------------------------------------------

/**
 * @typedef {object} UniverseSummary
 * @property {number} id
 * @property {string} name
 * @property {string} modified - ISO 8601 timestamp.
 */

/**
 * @typedef {object} UniverseDetail
 * @property {number} id
 * @property {PublisherRef} publisher
 * @property {string} name
 * @property {string} designation
 * @property {string} [desc]
 * @property {number|null} [gcd_id] - Grand Comics Database ID.
 * @property {string|null} [image]
 * @property {string} resource_url
 * @property {string} modified - ISO 8601 timestamp.
 */

/**
 * @typedef {object} UniverseParams
 * @property {string} [designation]
 * @property {string} [modified_gt] - ISO 8601 datetime; return records modified after this.
 * @property {string} [name]
 * @property {number} [page]
 */

// -- Sub-list (nested issue_list / series_list) params ---------------------

/** @typedef {{page?: number}} PageParams */

// -- Generic resource shapes, instantiated per-resource in resources.js ----

/** @typedef {import('./client.js').RequestOptions} RequestOptions */

/**
 * @template TSummary
 * @template TDetail
 * @template TParams
 * @typedef {object} ListResource
 * @property {(params?: TParams, options?: RequestOptions) => Promise<Paginated<TSummary>>} list - Fetch a single page.
 * @property {(params?: TParams, options?: RequestOptions) => AsyncGenerator<TSummary>} listAll - Iterate every result across all pages.
 * @property {(id: number, options?: RequestOptions) => Promise<TDetail>} get - Fetch a single record by ID.
 */

/** @typedef {ListResource<ArcSummary, ArcDetail, ArcParams> & {issueList: (id: number, params?: PageParams, options?: RequestOptions) => Promise<Paginated<IssueSummary>>, issueListAll: (id: number, params?: PageParams, options?: RequestOptions) => AsyncGenerator<IssueSummary>}} ArcApi */
/** @typedef {ListResource<CharacterSummary, CharacterDetail, CharacterParams> & {issueList: (id: number, params?: PageParams, options?: RequestOptions) => Promise<Paginated<IssueSummary>>, issueListAll: (id: number, params?: PageParams, options?: RequestOptions) => AsyncGenerator<IssueSummary>}} CharacterApi */
/** @typedef {ListResource<CreatorSummary, CreatorDetail, CreatorParams>} CreatorApi */
/** @typedef {ListResource<ImprintSummary, ImprintDetail, ImprintParams>} ImprintApi */
/** @typedef {ListResource<IssueSummary, IssueDetail, IssueParams>} IssueApi */
/** @typedef {ListResource<PublisherSummary, PublisherDetail, PublisherParams> & {seriesList: (id: number, params?: PageParams, options?: RequestOptions) => Promise<Paginated<SeriesSummary>>, seriesListAll: (id: number, params?: PageParams, options?: RequestOptions) => AsyncGenerator<SeriesSummary>}} PublisherApi */
/** @typedef {{list: (params?: RoleParams, options?: RequestOptions) => Promise<Paginated<RoleSummary>>, listAll: (params?: RoleParams, options?: RequestOptions) => AsyncGenerator<RoleSummary>}} RoleApi */
/** @typedef {ListResource<SeriesSummary, SeriesDetail, SeriesParams> & {issueList: (id: number, params?: PageParams, options?: RequestOptions) => Promise<Paginated<IssueSummary>>, issueListAll: (id: number, params?: PageParams, options?: RequestOptions) => AsyncGenerator<IssueSummary>}} SeriesApi */
/** @typedef {{list: (params?: SeriesTypeParams, options?: RequestOptions) => Promise<Paginated<SeriesTypeSummary>>, listAll: (params?: SeriesTypeParams, options?: RequestOptions) => AsyncGenerator<SeriesTypeSummary>}} SeriesTypeApi */
/** @typedef {ListResource<TeamSummary, TeamDetail, TeamParams> & {issueList: (id: number, params?: PageParams, options?: RequestOptions) => Promise<Paginated<IssueSummary>>, issueListAll: (id: number, params?: PageParams, options?: RequestOptions) => AsyncGenerator<IssueSummary>}} TeamApi */
/** @typedef {ListResource<UniverseSummary, UniverseDetail, UniverseParams>} UniverseApi */

export {};
