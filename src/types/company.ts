export type MutualOrganization = 'ACHS' | 'Mutual de Seguridad' | 'IST' | 'ISL' | 'Otro'

export type RiskLevel = 'Bajo' | 'Medio' | 'Alto' | 'Crítico'

export interface CompanyAddress {
  street: string
  number: string
  office: string
  commune: string
  city: string
  region: string
  country: string
  postalCode: string
}

export interface CompanyRepresentative {
  fullName: string
  rut: string
  position: string
  email: string
  phone: string
}

export interface ISO45001Info {
  isCertified: boolean
  certificationScope: string
  certificationBody: string
  certificationDate: string
  certificationExpiry: string
  nextAuditDate: string
  lastAuditFindings: string
}

export interface JointCommitteeInfo {
  hasCommittee: boolean
  resolutionNumber: string
  resolutionDate: string
  titularCompanyMember1: string
  titularCompanyMember2: string
  titularCompanyMember3: string
  titularWorkerMember1: string
  titularWorkerMember2: string
  titularWorkerMember3: string
  alternateCompanyMember1: string
  alternateCompanyMember2: string
  alternateCompanyMember3: string
  alternateWorkerMember1: string
  alternateWorkerMember2: string
  alternateWorkerMember3: string
}

export interface HealthAndSafetyInfo {
  mutualOrganization: MutualOrganization
  mutualAffiliateNumber: string
  hseManagerName: string
  hseManagerIdCard: string
  hseManagerEmail: string
  hseManagerPhone: string
  riskLevel: RiskLevel
  ds594LastInspectionDate: string
  ds594InspectorName: string
  ds594PendingFindings: string
  ds44LastTrainingDate: string
  ds44TrainerName: string
  ds44NextTrainingDate: string
  ley16744InsurancePolicy: string
  ley16744CoverageNotes: string
  emergencyPlanDocument: string
  riskAssessmentDocument: string
  jointCommittee: JointCommitteeInfo
  iso45001: ISO45001Info
}

export interface WorkforceProfile {
  totalEmployees: number
  femaleEmployees: number
  maleEmployees: number
  nonBinaryEmployees: number
  subcontractorCount: number
  unionizedPercentage: number
  averageSeniorityYears: number
  accidentFrequencyRate: number
  accidentSeverityRate: number
  accidentIncidenceRate: number
  absenteeismRate: number
  turnoverRate: number
  occupationalIllnessRate: number
  accidentabilityRate: number
  siniestralityRate: number
}

export interface CompanyDocuments {
  occupationalHealthPolicy: string
  emergencyPlan: string
  riskMatrix: string
  inductionProgram: string
  contractorControlPlan: string
}

export interface CompanySettings {
  general: {
    legalName: string
    tradeName: string
    rut: string
    businessActivity: string
    companyType: string
    foundingDate: string
    contactEmail: string
    contactPhone: string
    website: string
    address: CompanyAddress
  }
  representatives: {
    legalRepresentative: CompanyRepresentative
    safetyManager: CompanyRepresentative
    hrManager: CompanyRepresentative
  }
  healthAndSafety: HealthAndSafetyInfo
  workforce: WorkforceProfile
  documents: CompanyDocuments
}

export type CompanySettingsSection = keyof CompanySettings

export const COMPANY_MUTUAL_OPTIONS: MutualOrganization[] = ['ACHS', 'Mutual de Seguridad', 'IST', 'ISL', 'Otro']

export const COMPANY_RISK_LEVELS: RiskLevel[] = ['Bajo', 'Medio', 'Alto', 'Crítico']

export const createDefaultCompanySettings = (): CompanySettings => ({
  general: {
    legalName: '',
    tradeName: '',
    rut: '',
    businessActivity: '',
    companyType: '',
    foundingDate: '',
    contactEmail: '',
    contactPhone: '',
    website: '',
    address: {
      street: '',
      number: '',
      office: '',
      commune: '',
      city: '',
      region: '',
      country: 'Chile',
      postalCode: '',
    },
  },
  representatives: {
    legalRepresentative: {
      fullName: '',
      rut: '',
      position: '',
      email: '',
      phone: '',
    },
    safetyManager: {
      fullName: '',
      rut: '',
      position: '',
      email: '',
      phone: '',
    },
    hrManager: {
      fullName: '',
      rut: '',
      position: '',
      email: '',
      phone: '',
    },
  },
  healthAndSafety: {
    mutualOrganization: 'ACHS',
    mutualAffiliateNumber: '',
    hseManagerName: '',
    hseManagerIdCard: '',
    hseManagerEmail: '',
    hseManagerPhone: '',
    riskLevel: 'Bajo',
    ds594LastInspectionDate: '',
    ds594InspectorName: '',
    ds594PendingFindings: '',
    ds44LastTrainingDate: '',
    ds44TrainerName: '',
    ds44NextTrainingDate: '',
    ley16744InsurancePolicy: '',
    ley16744CoverageNotes: '',
    emergencyPlanDocument: '',
    riskAssessmentDocument: '',
    jointCommittee: {
      hasCommittee: false,
      resolutionNumber: '',
      resolutionDate: '',
      titularCompanyMember1: '',
      titularCompanyMember2: '',
      titularCompanyMember3: '',
      titularWorkerMember1: '',
      titularWorkerMember2: '',
      titularWorkerMember3: '',
      alternateCompanyMember1: '',
      alternateCompanyMember2: '',
      alternateCompanyMember3: '',
      alternateWorkerMember1: '',
      alternateWorkerMember2: '',
      alternateWorkerMember3: '',
    },
    iso45001: {
      isCertified: false,
      certificationScope: '',
      certificationBody: '',
      certificationDate: '',
      certificationExpiry: '',
      nextAuditDate: '',
      lastAuditFindings: '',
    },
  },
  workforce: {
    totalEmployees: 0,
    femaleEmployees: 0,
    maleEmployees: 0,
    nonBinaryEmployees: 0,
    subcontractorCount: 0,
    unionizedPercentage: 0,
    averageSeniorityYears: 0,
    accidentFrequencyRate: 0,
    accidentSeverityRate: 0,
    accidentIncidenceRate: 0,
    absenteeismRate: 0,
    turnoverRate: 0,
    occupationalIllnessRate: 0,
    accidentabilityRate: 0,
    siniestralityRate: 0,
  },
  documents: {
    occupationalHealthPolicy: '',
    emergencyPlan: '',
    riskMatrix: '',
    inductionProgram: '',
    contractorControlPlan: '',
  },
})
