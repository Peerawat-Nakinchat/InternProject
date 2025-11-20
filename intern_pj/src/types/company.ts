export interface CreateCompanyForm {
  org_id?: string
  org_name: string
  org_code: string
  owner_user_id: string
  org_address_1: string
  org_address_2: string
  org_address_3: string
  org_integrate: string
  org_integrate_url: string
  org_integrate_provider_id: string
  org_integrate_passcode: string
}

export interface IntegrationOption {
  label: string
  value: string
}
