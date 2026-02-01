import ucsdOrganizations from '../ucsd_organizations.json';

export interface UcsdOrganization {
  "Organization Name": string;
  "Description": string;
  "Contact Email": string;
}

const organizations = ucsdOrganizations as UcsdOrganization[];

export function getAllOrganizations(): UcsdOrganization[] {
  return organizations;
}

export function searchOrganizations(query: string): UcsdOrganization[] {
  if (!query.trim()) {
    return organizations;
  }
  const lower = query.toLowerCase();
  return organizations.filter(org =>
    org["Organization Name"].toLowerCase().includes(lower) ||
    org["Description"].toLowerCase().includes(lower)
  );
}

export function getOrganizationByName(name: string): UcsdOrganization | undefined {
  return organizations.find(org => org["Organization Name"] === name);
}
