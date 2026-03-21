/**
 * PGA (Partner Government Agency) Message Set Adapter
 *
 * Determines which PGA agencies apply based on commodity/HTS codes
 * and builds agency-specific message sets for ACE filing.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PGAAgencyCode = "FDA" | "USDA" | "EPA" | "CPSC" | "FCC" | "APHIS" | "TTB" | "FWS" | "DOT" | "DEA";

export interface PGAAgency {
  code: PGAAgencyCode;
  name: string;
  full_name: string;
  description: string;
}

export interface PGAFieldRequirement {
  field_name: string;
  label: string;
  required: boolean;
  description: string;
  type: "text" | "date" | "select" | "number";
  options?: string[];
}

export interface PGARequirement {
  agency: PGAAgency;
  reason: string;
  hts_match: string;
  fields: PGAFieldRequirement[];
}

export interface PGAMessageData {
  agency_code: PGAAgencyCode;
  case_id: string;
  fields: Record<string, string | number | null>;
  status: PGAMessageStatus;
  generated_at: string;
}

export type PGAMessageStatus = "draft" | "complete" | "submitted" | "cleared" | "hold";

// ---------------------------------------------------------------------------
// Agency definitions
// ---------------------------------------------------------------------------

export const PGA_AGENCIES: Record<PGAAgencyCode, PGAAgency> = {
  FDA: { code: "FDA", name: "FDA", full_name: "Food and Drug Administration", description: "Foods, drugs, medical devices, cosmetics, biologics" },
  USDA: { code: "USDA", name: "USDA", full_name: "Dept. of Agriculture", description: "Meat, poultry, plants, seeds, soil" },
  EPA: { code: "EPA", name: "EPA", full_name: "Environmental Protection Agency", description: "Pesticides, toxic substances, vehicles, engines" },
  CPSC: { code: "CPSC", name: "CPSC", full_name: "Consumer Product Safety Commission", description: "Consumer products safety" },
  FCC: { code: "FCC", name: "FCC", full_name: "Federal Communications Commission", description: "Electronic devices, radio equipment" },
  APHIS: { code: "APHIS", name: "APHIS", full_name: "Animal & Plant Health Inspection Service", description: "Animals, animal products, plant pests" },
  TTB: { code: "TTB", name: "TTB", full_name: "Alcohol & Tobacco Tax and Trade Bureau", description: "Alcohol, tobacco, firearms" },
  FWS: { code: "FWS", name: "FWS", full_name: "Fish & Wildlife Service", description: "Wildlife, CITES species, fish" },
  DOT: { code: "DOT", name: "DOT", full_name: "Dept. of Transportation", description: "Hazardous materials, motor vehicle safety" },
  DEA: { code: "DEA", name: "DEA", full_name: "Drug Enforcement Administration", description: "Controlled substances, precursor chemicals" },
};

// ---------------------------------------------------------------------------
// HTS prefix to PGA mapping (simplified lookup)
// ---------------------------------------------------------------------------

interface HTSRule {
  prefix: string;
  agencies: PGAAgencyCode[];
  reason: string;
}

const HTS_PGA_RULES: HTSRule[] = [
  // Chapter 2-4: Meat, dairy, fish
  { prefix: "02", agencies: ["USDA", "FDA"], reason: "Meat products" },
  { prefix: "03", agencies: ["FDA", "FWS"], reason: "Fish and seafood" },
  { prefix: "04", agencies: ["FDA", "USDA"], reason: "Dairy products" },
  // Chapter 6-14: Plants, vegetables, food
  { prefix: "06", agencies: ["USDA", "APHIS"], reason: "Live plants" },
  { prefix: "07", agencies: ["FDA", "USDA"], reason: "Vegetables" },
  { prefix: "08", agencies: ["FDA", "USDA", "APHIS"], reason: "Fruits" },
  { prefix: "09", agencies: ["FDA"], reason: "Coffee, tea, spices" },
  { prefix: "10", agencies: ["FDA", "USDA"], reason: "Cereals" },
  { prefix: "15", agencies: ["FDA"], reason: "Fats and oils" },
  { prefix: "16", agencies: ["FDA", "USDA"], reason: "Prepared meat/fish" },
  { prefix: "17", agencies: ["FDA"], reason: "Sugar and confectionery" },
  { prefix: "18", agencies: ["FDA"], reason: "Cocoa and preparations" },
  { prefix: "19", agencies: ["FDA"], reason: "Cereal preparations" },
  { prefix: "20", agencies: ["FDA"], reason: "Prepared vegetables/fruits" },
  { prefix: "21", agencies: ["FDA"], reason: "Miscellaneous food" },
  { prefix: "22", agencies: ["FDA", "TTB"], reason: "Beverages / alcohol" },
  { prefix: "24", agencies: ["TTB"], reason: "Tobacco" },
  // Chapter 28-29: Chemicals
  { prefix: "28", agencies: ["EPA", "DEA"], reason: "Inorganic chemicals" },
  { prefix: "29", agencies: ["EPA", "DEA"], reason: "Organic chemicals" },
  { prefix: "30", agencies: ["FDA", "DEA"], reason: "Pharmaceutical products" },
  // Chapter 33: Cosmetics
  { prefix: "33", agencies: ["FDA"], reason: "Essential oils, cosmetics" },
  // Chapter 38: Chemical products
  { prefix: "38", agencies: ["EPA"], reason: "Chemical products" },
  // Chapter 40: Rubber (tires -- DOT)
  { prefix: "4011", agencies: ["DOT"], reason: "Tires" },
  // Chapter 84-85: Electronics/machinery
  { prefix: "8471", agencies: ["FCC"], reason: "Computers" },
  { prefix: "8517", agencies: ["FCC"], reason: "Telecom equipment" },
  { prefix: "8518", agencies: ["FCC"], reason: "Audio equipment" },
  { prefix: "8525", agencies: ["FCC"], reason: "Transmitters/cameras" },
  { prefix: "8527", agencies: ["FCC"], reason: "Radio receivers" },
  { prefix: "8528", agencies: ["FCC"], reason: "Monitors/TVs" },
  { prefix: "8529", agencies: ["FCC"], reason: "Parts for telecom" },
  // Chapter 87: Vehicles
  { prefix: "8703", agencies: ["EPA", "DOT"], reason: "Motor vehicles" },
  // Chapter 90: Medical devices
  { prefix: "9018", agencies: ["FDA"], reason: "Medical instruments" },
  { prefix: "9019", agencies: ["FDA"], reason: "Therapeutic devices" },
  // Chapter 95: Toys
  { prefix: "9503", agencies: ["CPSC"], reason: "Toys" },
  { prefix: "9504", agencies: ["CPSC"], reason: "Games" },
];

// ---------------------------------------------------------------------------
// Agency-specific field requirements
// ---------------------------------------------------------------------------

const AGENCY_FIELDS: Record<PGAAgencyCode, PGAFieldRequirement[]> = {
  FDA: [
    { field_name: "product_code", label: "FDA Product Code", required: true, description: "7-character FDA product code", type: "text" },
    { field_name: "prior_notice_number", label: "Prior Notice Confirmation", required: false, description: "PN confirmation number for food", type: "text" },
    { field_name: "establishment_registration", label: "Establishment Registration #", required: false, description: "Foreign facility registration", type: "text" },
    { field_name: "intended_use", label: "Intended Use", required: true, description: "Intended use code", type: "select", options: ["consumption", "processing", "repacking", "other"] },
  ],
  USDA: [
    { field_name: "permit_number", label: "USDA Permit Number", required: false, description: "Import permit number", type: "text" },
    { field_name: "facility_id", label: "Foreign Establishment #", required: true, description: "Foreign slaughter/processing facility", type: "text" },
    { field_name: "product_category", label: "Product Category", required: true, description: "USDA product category", type: "select", options: ["meat", "poultry", "egg_product", "plant", "seed"] },
  ],
  EPA: [
    { field_name: "tsca_certification", label: "TSCA Certification", required: true, description: "Toxic Substances Control Act cert", type: "select", options: ["positive", "negative", "not_applicable"] },
    { field_name: "vehicle_epa_code", label: "EPA Code", required: false, description: "EPA vehicle/engine code", type: "text" },
    { field_name: "certification_type", label: "Certification Type", required: true, description: "Type of EPA certification", type: "select", options: ["section_6", "section_12b", "section_13", "vehicles_engines"] },
  ],
  CPSC: [
    { field_name: "product_type", label: "Product Type", required: true, description: "CPSC product category", type: "text" },
    { field_name: "testing_lab", label: "Testing Lab", required: false, description: "Accredited testing laboratory", type: "text" },
    { field_name: "certificate_number", label: "Certificate #", required: true, description: "Certificate of compliance number", type: "text" },
  ],
  FCC: [
    { field_name: "fcc_id", label: "FCC ID", required: false, description: "FCC equipment authorization ID", type: "text" },
    { field_name: "equipment_class", label: "Equipment Class", required: true, description: "FCC equipment class", type: "select", options: ["intentional_radiator", "unintentional_radiator", "incidental_radiator"] },
    { field_name: "compliance_type", label: "Compliance Type", required: true, description: "Type of FCC compliance", type: "select", options: ["certification", "sdoc", "verification"] },
  ],
  APHIS: [
    { field_name: "permit_number", label: "APHIS Permit #", required: true, description: "APHIS import permit", type: "text" },
    { field_name: "origin_facility", label: "Origin Facility", required: false, description: "Foreign origin facility ID", type: "text" },
    { field_name: "inspection_required", label: "Inspection Required", required: true, description: "Requires port inspection", type: "select", options: ["yes", "no"] },
  ],
  TTB: [
    { field_name: "permit_number", label: "TTB Permit #", required: true, description: "Importer permit/license", type: "text" },
    { field_name: "cola_number", label: "COLA #", required: false, description: "Certificate of Label Approval", type: "text" },
    { field_name: "product_class", label: "Product Class", required: true, description: "TTB product class", type: "select", options: ["wine", "beer", "distilled_spirits", "tobacco"] },
  ],
  FWS: [
    { field_name: "declaration_form", label: "FWS Form 3-177", required: true, description: "Declaration for wildlife", type: "select", options: ["filed", "not_filed"] },
    { field_name: "cites_permit", label: "CITES Permit #", required: false, description: "CITES permit number", type: "text" },
    { field_name: "species", label: "Species", required: true, description: "Species scientific name", type: "text" },
  ],
  DOT: [
    { field_name: "hs7_declaration", label: "HS-7 Declaration", required: true, description: "DOT HS-7 import declaration", type: "select", options: ["filed", "not_required"] },
    { field_name: "fmvss_compliance", label: "FMVSS Compliant", required: false, description: "Federal Motor Vehicle Safety Standards", type: "select", options: ["yes", "no", "exempt"] },
    { field_name: "dot_registration", label: "DOT Registration #", required: false, description: "Registered importer number", type: "text" },
  ],
  DEA: [
    { field_name: "import_permit", label: "DEA Import Permit", required: true, description: "DEA Form 236 permit", type: "text" },
    { field_name: "schedule", label: "Schedule", required: true, description: "Controlled substance schedule", type: "select", options: ["I", "II", "III", "IV", "V", "listed_chemical"] },
    { field_name: "dea_registration", label: "DEA Registration #", required: true, description: "Importer DEA registration", type: "text" },
  ],
};

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Determine which PGA agencies apply based on HTS codes and commodity description.
 */
export function determinePGARequirements(
  commodityDescription: string,
  htsCode: string,
): PGARequirement[] {
  const requirements: PGARequirement[] = [];
  const seen = new Set<PGAAgencyCode>();
  const normalizedHts = htsCode.replace(/\./g, "");
  const descLower = commodityDescription.toLowerCase();

  // Match HTS prefix rules
  for (const rule of HTS_PGA_RULES) {
    if (normalizedHts.startsWith(rule.prefix)) {
      for (const agencyCode of rule.agencies) {
        if (!seen.has(agencyCode)) {
          seen.add(agencyCode);
          requirements.push({
            agency: PGA_AGENCIES[agencyCode],
            reason: rule.reason,
            hts_match: rule.prefix,
            fields: AGENCY_FIELDS[agencyCode],
          });
        }
      }
    }
  }

  // Keyword-based fallback detection
  const keywordMap: Record<string, PGAAgencyCode[]> = {
    food: ["FDA"],
    drug: ["FDA", "DEA"],
    pharmaceutical: ["FDA", "DEA"],
    cosmetic: ["FDA"],
    medical: ["FDA"],
    pesticide: ["EPA"],
    chemical: ["EPA"],
    toy: ["CPSC"],
    children: ["CPSC"],
    radio: ["FCC"],
    wireless: ["FCC"],
    bluetooth: ["FCC"],
    wifi: ["FCC"],
    alcohol: ["TTB"],
    wine: ["TTB"],
    beer: ["TTB"],
    tobacco: ["TTB"],
    animal: ["APHIS", "FWS"],
    plant: ["APHIS"],
    vehicle: ["DOT", "EPA"],
    automobile: ["DOT", "EPA"],
  };

  for (const [keyword, agencies] of Object.entries(keywordMap)) {
    if (descLower.includes(keyword)) {
      for (const agencyCode of agencies) {
        if (!seen.has(agencyCode)) {
          seen.add(agencyCode);
          requirements.push({
            agency: PGA_AGENCIES[agencyCode],
            reason: `Commodity description contains "${keyword}"`,
            hts_match: "",
            fields: AGENCY_FIELDS[agencyCode],
          });
        }
      }
    }
  }

  return requirements;
}

/**
 * Build a PGA message set for a specific agency (stub).
 * In production, this would generate the ACE PGA message format.
 */
export function buildPGAMessage(
  agencyCode: PGAAgencyCode,
  caseId: string,
  fieldValues: Record<string, string | number | null>,
): PGAMessageData {
  return {
    agency_code: agencyCode,
    case_id: caseId,
    fields: fieldValues,
    status: "draft",
    generated_at: new Date().toISOString(),
  };
}
