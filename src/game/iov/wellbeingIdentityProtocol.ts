export interface WellbeingIdentityLayer {
  key: string;
  label: string;
  facets: string[];
  color: string;
}

// Vocabulary mirrored from:
// /Users/mosessampaul/Documents/TheIOV/Individual Repos/the-internet-of-value-spec/specs/protocols/wellbeing-identity/spec.md
// and companion *-identity-map.md files (v0.1.7 locked L2/L3 facets).
export const WELLBEING_IDENTITY_LAYERS: WellbeingIdentityLayer[] = [
  {
    key: "given",
    label: "~~GivenIdentity",
    color: "#f5c84c",
    facets: [
      "~~~FullName",
      "~~~NationalId",
      "~~~BirthDate",
      "~~~BirthPlace",
      "~~~Sex",
      "~~~Language",
      "~~~Nationality",
      "~~~Citizenship",
      "~~~Religion",
      "~~~Genetics",
      "~~~DID",
    ],
  },
  {
    key: "earned",
    label: "~~EarnedIdentity",
    color: "#4f95ff",
    facets: [
      "~~~Schooling",
      "~~~UG",
      "~~~PG",
      "~~~PhD",
      "~~~Certifications",
      "~~~WorkExperience",
      "~~~Portfolio",
    ],
  },
  {
    key: "rented",
    label: "~~RentedIdentity",
    color: "#31ba6d",
    facets: [
      "~~~X",
      "~~~LinkedIn",
      "~~~YouTube",
      "~~~Instagram",
      "~~~Substack",
      "~~~GitHub",
      "~~~WebsiteHandles",
    ],
  },
  {
    key: "moral",
    label: "~~MoralCompass",
    color: "#f1f3f8",
    facets: ["~~~Virtues", "~~~Values", "~~~EthicalBoundaries"],
  },
  {
    key: "story",
    label: "~~Story",
    color: "#ef4f5f",
    facets: ["~~~Past", "~~~Now", "~~~Future", "~~~TurningPoints", "~~~Vision"],
  },
  {
    key: "skills",
    label: "~~Skills",
    color: "#2f82dd",
    facets: [
      "~~~HardSkills",
      "~~~SoftSkills",
      "~~~SkillLevel",
      "~~~SkillEvidence",
      "~~~SkillTrajectory",
    ],
  },
  {
    key: "identity_state",
    label: "~~IdentityState",
    color: "#a67df3",
    facets: ["~~~WellbeingScore", "~~~ScoreHistory", "~~~ProtocolConvergence"],
  },
  {
    key: "consent",
    label: "~~ConsentAndDisclosure",
    color: "#6d8aa6",
    facets: [
      "~~~DisclosurePolicy",
      "~~~SelectiveDisclosure",
      "~~~RevocationState",
    ],
  },
];

export const getLayerByFacet = (facet: string) =>
  WELLBEING_IDENTITY_LAYERS.find((layer) => layer.facets.includes(facet));
