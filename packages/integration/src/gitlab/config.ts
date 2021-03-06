/*
 * Copyright 2020 Spotify AB
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Config } from '@backstage/config';

const GITLAB_HOST = 'gitlab.com';

/**
 * The configuration parameters for a single GitLab integration.
 */
export type GitLabIntegrationConfig = {
  /**
   * The host of the target that this matches on, e.g. "gitlab.com"
   */
  host: string;

  /**
   * The authorization token to use for requests this provider.
   *
   * If no token is specified, anonymous access is used.
   */
  token?: string;
};

/**
 * Reads a single GitLab integration config.
 *
 * @param config The config object of a single integration
 */
export function readGitLabIntegrationConfig(
  config: Config,
): GitLabIntegrationConfig {
  const host = config.getOptionalString('host') ?? GITLAB_HOST;
  const token = config.getOptionalString('token');
  return { host, token };
}

/**
 * Reads a set of GitLab integration configs, and inserts some defaults for
 * public GitLab if not specified.
 *
 * @param configs All of the integration config objects
 */
export function readGitLabIntegrationConfigs(
  configs: Config[],
): GitLabIntegrationConfig[] {
  // First read all the explicit integrations
  const result = configs.map(readGitLabIntegrationConfig);

  // As a convenience we always make sure there's at least an unauthenticated
  // reader for public gitlab repos.
  if (!result.some(c => c.host === GITLAB_HOST)) {
    result.push({ host: GITLAB_HOST });
  }

  return result;
}
