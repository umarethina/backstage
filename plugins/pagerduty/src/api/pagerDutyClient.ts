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

import { createApiRef } from '@backstage/core';
import {
  Service,
  Incident,
  RequestOptions,
  ClientApiConfig,
  ServicesResponse,
  IncidentsResponse,
  OnCallsResponse,
  OnCall,
} from '../components/types';

export const pagerDutyApiRef = createApiRef<PagerDutyClientApi>({
  id: 'plugin.pagerduty.api',
  description: 'Used to fetch data from PagerDuty API',
});

interface PagerDutyClient {
  getServiceByIntegrationKey(integrationKey: string): Promise<Service[]>;
  getIncidentsByServiceId(serviceId: string): Promise<Incident[]>;
  getOnCallByPolicyId(policyId: string): Promise<OnCall[]>;
}

export class PagerDutyClientApi implements PagerDutyClient {
  private API_URL = 'https://api.pagerduty.com';
  private EVENTS_API_URL = 'https://events.pagerduty.com/v2';

  constructor(private readonly config?: ClientApiConfig) {}

  async getServiceByIntegrationKey(integrationKey: string): Promise<Service[]> {
    if (!this.config?.token) {
      throw new Error('Missing token');
    }

    const params = `include[]=integrations&include[]=escalation_policies&query=${integrationKey}`;
    const url = `${this.API_URL}/services?${params}`;
    const { services } = await this.getByUrl<ServicesResponse>(url);

    return services;
  }

  async getIncidentsByServiceId(serviceId: string): Promise<Incident[]> {
    if (!this.config?.token) {
      throw new Error('Missing token');
    }

    const params = `service_ids[]=${serviceId}`;
    const url = `${this.API_URL}/incidents?${params}`;
    const { incidents } = await this.getByUrl<IncidentsResponse>(url);

    return incidents;
  }

  async getOnCallByPolicyId(policyId: string): Promise<OnCall[]> {
    if (!this.config?.token) {
      throw new Error('Missing token');
    }

    const params = `include[]=users&escalation_policy_ids[]=${policyId}`;
    const url = `${this.API_URL}/oncalls?${params}`;
    const { oncalls } = await this.getByUrl<OnCallsResponse>(url);

    return oncalls;
  }

  triggerPagerDutyAlarm(
    integrationKey: string,
    source: string,
    description: string,
    userName: string,
  ) {
    const body = JSON.stringify({
      event_action: 'trigger',
      routing_key: integrationKey,
      client: 'Backstage',
      client_url: source,
      payload: {
        summary: description,
        source: source,
        severity: 'error',
        class: 'manual trigger',
        custom_details: {
          user: userName,
        },
      },
    });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        Accept: 'application/json, text/plain, */*',
      },
      body,
    };

    return this.request(`${this.EVENTS_API_URL}/enqueue`, options);
  }

  private async getByUrl<T>(url: string): Promise<T> {
    const options = {
      method: 'GET',
      headers: {
        Authorization: `Token token=${this.config!.token}`,
        Accept: 'application/vnd.pagerduty+json;version=2',
        'Content-Type': 'application/json',
      },
    };
    const response = await this.request(url, options);

    return response.json();
  }

  private async request(
    url: string,
    options: RequestOptions,
  ): Promise<Response> {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const payload = await response.json();
        const errors = payload.errors.map((error: string) => error).join(' ');
        const message = `Request failed with ${response.status}, ${errors}`;
        throw new Error(message);
      }
      return response;
    } catch (error) {
      throw new Error(error);
    }
  }
}