import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.ancestryBreakdown.deleteMany();
  await prisma.variantFinding.deleteMany();
  await prisma.gapReport.deleteMany();
  await prisma.dataset.deleteMany();
  await prisma.biobankSubmission.deleteMany();

  // === DATASET 1: TCGA Prostate Cancer ===
  const tcgaProstate = await prisma.dataset.create({
    data: {
      name: "TCGA Prostate Cancer (PRAD)",
      description: "The Cancer Genome Atlas Prostate Adenocarcinoma cohort",
      source: "TCGA",
      cancerType: "Prostate Adenocarcinoma",
      totalSamples: 502,
      status: "completed",
      ancestryBreakdown: {
        create: [
          { population: "European (Non-Hispanic White)", count: 472, percentage: 94.0 },
          { population: "African (Non-Hispanic Black)", count: 15, percentage: 3.0 },
          { population: "Hispanic/Latino", count: 8, percentage: 1.6 },
          { population: "East Asian", count: 5, percentage: 1.0 },
          { population: "American Indian/Alaska Native", count: 1, percentage: 0.2 },
          { population: "Other/Mixed", count: 1, percentage: 0.2 },
        ],
      },
      variantFindings: {
        create: [
          { gene: "BRCA2", variant: "rs206115", classification: "Pathogenic", populationFrequency: 0.038, referenceFrequency: 0.045, ancestryBiasScore: 0.72, notes: "Underdetected in African ancestry cohorts" },
          { gene: "TP53", variant: "rs28934578", classification: "Likely Pathogenic", populationFrequency: 0.022, referenceFrequency: 0.031, ancestryBiasScore: 0.65, notes: "Frequency gap suggests missed variants in underrepresented populations" },
          { gene: "SPOP", variant: "rs1234567", classification: "Pathogenic", populationFrequency: 0.089, referenceFrequency: 0.095, ancestryBiasScore: 0.42, notes: "Relatively well-captured across populations" },
          { gene: "FOXA1", variant: "c.463G>A", classification: "VUS", populationFrequency: 0.012, referenceFrequency: 0.028, ancestryBiasScore: 0.81, notes: "VUS rate elevated — likely due to sparse non-European reference data" },
          { gene: "BRCA1", variant: "rs1799966", classification: "Likely Benign", populationFrequency: 0.015, referenceFrequency: 0.018, ancestryBiasScore: 0.35, notes: "Well-characterized founder variant" },
          { gene: "ATM", variant: "c.7271T>G", classification: "Pathogenic", populationFrequency: 0.008, referenceFrequency: 0.022, ancestryBiasScore: 0.88, notes: "Critical gap: frequency 2.75x higher in diverse reference panels" },
          { gene: "MSH2", variant: "rs4987188", classification: "Likely Pathogenic", populationFrequency: 0.006, referenceFrequency: 0.015, ancestryBiasScore: 0.78, notes: "Underrepresentation in current dataset" },
          { gene: "CHEK2", variant: "c.1100delC", classification: "Pathogenic", populationFrequency: 0.019, referenceFrequency: 0.025, ancestryBiasScore: 0.55, notes: "European founder variant — poor transferability" },
        ],
      },
    },
  });

  await prisma.gapReport.create({
    data: {
      datasetId: tcgaProstate.id,
      title: "TCGA PRAD Diversity Assessment",
      cancerType: "Prostate Adenocarcinoma",
      overallDiversityScore: 12.4,
      underrepresentedPops: JSON.stringify(["African", "Hispanic/Latino", "East Asian", "American Indian/Alaska Native", "South Asian"]),
      recommendations: JSON.stringify([
        "Priority: Recruit African ancestry patients — represents 21% of US prostate cancer but only 3% of TCGA samples",
        "Establish partnerships with community oncology centers in underserved areas",
        "Implement ancestry-informed variant interpretation pipeline",
        "Cross-reference with international datasets (ICGC, H3Africa) to fill gaps",
        "Develop population-specific reference panels for pathogenicity scoring",
      ]),
      status: "finalized",
    },
  });

  // === DATASET 2: TCGA Colon Cancer ===
  const tcgaColon = await prisma.dataset.create({
    data: {
      name: "TCGA Colon Cancer (COAD)",
      description: "The Cancer Genome Atlas Colon Adenocarcinoma cohort",
      source: "TCGA",
      cancerType: "Colon Adenocarcinoma",
      totalSamples: 461,
      status: "completed",
      ancestryBreakdown: {
        create: [
          { population: "European (Non-Hispanic White)", count: 346, percentage: 75.1 },
          { population: "African (Non-Hispanic Black)", count: 52, percentage: 11.3 },
          { population: "Hispanic/Latino", count: 28, percentage: 6.1 },
          { population: "East Asian", count: 18, percentage: 3.9 },
          { population: "South Asian", count: 12, percentage: 2.6 },
          { population: "American Indian/Alaska Native", count: 3, percentage: 0.7 },
          { population: "Other/Mixed", count: 2, percentage: 0.4 },
        ],
      },
      variantFindings: {
        create: [
          { gene: "APC", variant: "rs41115", classification: "Pathogenic", populationFrequency: 0.065, referenceFrequency: 0.072, ancestryBiasScore: 0.48, notes: "Common truncating mutation across ancestries" },
          { gene: "KRAS", variant: "c.35G>A (G12D)", classification: "Pathogenic", populationFrequency: 0.042, referenceFrequency: 0.048, ancestryBiasScore: 0.52, notes: "Hotspot mutation well-characterized" },
          { gene: "TP53", variant: "R175H", classification: "Pathogenic", populationFrequency: 0.035, referenceFrequency: 0.041, ancestryBiasScore: 0.45, notes: "Relatively uniform across populations" },
          { gene: "PIK3CA", variant: "H1047R", classification: "Pathogenic", populationFrequency: 0.028, referenceFrequency: 0.035, ancestryBiasScore: 0.58, notes: "Potential underdetection in non-European populations" },
          { gene: "BRAF", variant: "V600E", classification: "Pathogenic", populationFrequency: 0.018, referenceFrequency: 0.022, ancestryBiasScore: 0.39, notes: "Better captured but still gaps in rare subtypes" },
          { gene: "MSH6", variant: "c.3261dupC", classification: "Likely Pathogenic", populationFrequency: 0.009, referenceFrequency: 0.024, ancestryBiasScore: 0.85, notes: "Significant underdetection in diverse populations" },
          { gene: "MLH1", variant: "c.677C>T", classification: "VUS", populationFrequency: 0.014, referenceFrequency: 0.032, ancestryBiasScore: 0.82, notes: "VUS elevated due to limited ancestral reference data" },
        ],
      },
    },
  });

  await prisma.gapReport.create({
    data: {
      datasetId: tcgaColon.id,
      title: "TCGA COAD Diversity Assessment",
      cancerType: "Colon Adenocarcinoma",
      overallDiversityScore: 24.9,
      underrepresentedPops: JSON.stringify(["Hispanic/Latino", "East Asian", "American Indian/Alaska Native", "South Asian"]),
      recommendations: JSON.stringify([
        "Hispanic/Latino patients represent ~19% of US colon cancer but only 6.1% of TCGA samples",
        "Priority recruitment needed in community hospitals serving minority populations",
        "MSH6 and MLH1 variant interpretation needs population-specific reference data",
        "Partner with rural oncology networks to expand geographic coverage",
        "Implement ancestry-aware MSI screening protocols",
      ]),
      status: "finalized",
    },
  });

  // === DATASET 3: Community Biobank Pilot ===
  const communityBio = await prisma.dataset.create({
    data: {
      name: "Community Oncology Network Biobank (Pilot)",
      description: "Pilot biobanking program across 12 community oncology centers in underserved areas",
      source: "Community Biobank",
      cancerType: "Multiple",
      totalSamples: 1847,
      status: "completed",
      ancestryBreakdown: {
        create: [
          { population: "European (Non-Hispanic White)", count: 554, percentage: 30.0 },
          { population: "African (Non-Hispanic Black)", count: 425, percentage: 23.0 },
          { population: "Hispanic/Latino", count: 387, percentage: 20.9 },
          { population: "East Asian", count: 166, percentage: 9.0 },
          { population: "South Asian", count: 120, percentage: 6.5 },
          { population: "American Indian/Alaska Native", count: 95, percentage: 5.1 },
          { population: "Pacific Islander", count: 52, percentage: 2.8 },
          { population: "Other/Mixed", count: 48, percentage: 2.6 },
        ],
      },
      variantFindings: {
        create: [
          { gene: "EGFR", variant: "L858R", classification: "Pathogenic", populationFrequency: 0.045, referenceFrequency: 0.042, ancestryBiasScore: 0.12, notes: "Well-captured; diverse dataset improves detection" },
          { gene: "BRCA1", variant: "c.5266dupC", classification: "Pathogenic", populationFrequency: 0.021, referenceFrequency: 0.018, ancestryBiasScore: 0.15, notes: "Improved representation reduces bias" },
          { gene: "TP53", variant: "R273H", classification: "Pathogenic", populationFrequency: 0.038, referenceFrequency: 0.041, ancestryBiasScore: 0.18, notes: "Near-reference detection across populations" },
          { gene: "ALK", variant: "EML4-ALK fusion", classification: "Pathogenic", populationFrequency: 0.012, referenceFrequency: 0.015, ancestryBiasScore: 0.25, notes: "Slight improvement over TCGA benchmarks" },
          { gene: "PIK3CA", variant: "E545K", classification: "Likely Pathogenic", populationFrequency: 0.032, referenceFrequency: 0.035, ancestryBiasScore: 0.20, notes: "Community data enriches variant landscape" },
          { gene: "KRAS", variant: "G12C", classification: "Pathogenic", populationFrequency: 0.029, referenceFrequency: 0.031, ancestryBiasScore: 0.15, notes: "Strong cross-population representation" },
        ],
      },
    },
  });

  await prisma.gapReport.create({
    data: {
      datasetId: communityBio.id,
      title: "Community Biobank Pilot Diversity Report",
      cancerType: "Multiple",
      overallDiversityScore: 78.6,
      underrepresentedPops: JSON.stringify(["Pacific Islander", "American Indian/Alaska Native"]),
      recommendations: JSON.stringify([
        "Excellent diversity — expand AI/AN and Pacific Islander recruitment",
        "Scale pilot to 50+ community centers nationally",
        "Publish community-acquired variant frequencies as new reference standard",
        "Implement longitudinal sample collection for tumor evolution tracking",
        "Develop mobile sequencing units for rural Health Professional Shortage Areas",
      ]),
      status: "finalized",
    },
  });

  // === DATASET 4: GWAS Meta-Analysis ===
  const gwas = await prisma.dataset.create({
    data: {
      name: "Cancer GWAS Meta-Analysis 2024",
      description: "Aggregated genome-wide association study data across 23 cancer types from international consortia",
      source: "GWAS Catalog",
      cancerType: "Multiple",
      totalSamples: 2450000,
      status: "completed",
      ancestryBreakdown: {
        create: [
          { population: "European", count: 2107000, percentage: 86.0 },
          { population: "East Asian", count: 196000, percentage: 8.0 },
          { population: "African", count: 73500, percentage: 3.0 },
          { population: "Hispanic/Latino", count: 49000, percentage: 2.0 },
          { population: "South Asian", count: 14700, percentage: 0.6 },
          { population: "Other", count: 9800, percentage: 0.4 },
        ],
      },
      variantFindings: {
        create: [
          { gene: "FGFR2", variant: "rs2981578", classification: "Risk Allele", populationFrequency: 0.032, referenceFrequency: 0.038, ancestryBiasScore: 0.62, notes: "Risk association may differ in non-European populations" },
          { gene: "TERT", variant: "rs2736098", classification: "Risk Allele", populationFrequency: 0.041, referenceFrequency: 0.048, ancestryBiasScore: 0.58, notes: "Telomere-related risk variant needs trans-ethnic validation" },
          { gene: "CDKN2A", variant: "rs10811661", classification: "Risk Allele", populationFrequency: 0.025, referenceFrequency: 0.036, ancestryBiasScore: 0.75, notes: "Major gap in African ancestry risk calibration" },
          { gene: "BCL2", variant: "rs3789060", classification: "Risk Allele", populationFrequency: 0.019, referenceFrequency: 0.028, ancestryBiasScore: 0.72, notes: "Poorly characterized in Hispanic/Latino and AI/AN populations" },
          { gene: "CHEK2", variant: "rs17879961", classification: "Risk Allele", populationFrequency: 0.022, referenceFrequency: 0.026, ancestryBiasScore: 0.50, notes: "European founder variant — limited transferability" },
        ],
      },
    },
  });

  await prisma.gapReport.create({
    data: {
      datasetId: gwas.id,
      title: "GWAS Meta-Analysis Ancestry Gap Report",
      cancerType: "Multiple",
      overallDiversityScore: 18.2,
      underrepresentedPops: JSON.stringify(["African", "Hispanic/Latino", "South Asian", "American Indian/Alaska Native", "Pacific Islander"]),
      recommendations: JSON.stringify([
        "86% European composition severely limits trans-ethnic applicability",
        "Prioritize African ancestry GWAS — polygenic risk scores lose 40-70% accuracy in non-European populations",
        "Fund dedicated sequencing in South Asian and Indigenous communities",
        "Develop trans-ethnic fine-mapping methods that leverage shared LD patterns",
        "Create ancestry-stratified summary statistics for public release",
      ]),
      status: "finalized",
    },
  });

  // === DATASET 5: In-progress analysis ===
  const inProgress = await prisma.dataset.create({
    data: {
      name: "Rural Appalachian Oncology Biobank",
      description: "Emerging biobank from rural oncology centers in Appalachian region",
      source: "Rural Biobank",
      cancerType: "Lung, Breast, Colorectal",
      totalSamples: 423,
      status: "analyzing",
      ancestryBreakdown: {
        create: [
          { population: "European (Non-Hispanic White)", count: 312, percentage: 73.8 },
          { population: "African (Non-Hispanic Black)", count: 68, percentage: 16.1 },
          { population: "Hispanic/Latino", count: 25, percentage: 5.9 },
          { population: "Other/Mixed", count: 18, percentage: 4.3 },
        ],
      },
      variantFindings: {
        create: [
          { gene: "KRAS", variant: "G12C", classification: "Pathogenic", populationFrequency: 0.034, referenceFrequency: 0.031, ancestryBiasScore: 0.22, notes: "Elevated lung cancer mutation rate in Appalachian cohort" },
          { gene: "EGFR", variant: "exon 19 del", classification: "Pathogenic", populationFrequency: 0.028, referenceFrequency: 0.025, ancestryBiasScore: 0.18, notes: "Comparable to national rates" },
          { gene: "TP53", variant: "R248W", classification: "Likely Pathogenic", populationFrequency: 0.019, referenceFrequency: 0.024, ancestryBiasScore: 0.32, notes: "Potential novel subclonal variants" },
        ],
      },
    },
  });

  // === BIOBANK SUBMISSIONS ===
  await prisma.biobankSubmission.createMany({
    data: [
      { institutionName: "Navajo Nation Department of Health", location: "Window Rock, AZ", sampleCount: 45, cancerTypes: JSON.stringify(["Breast", "Colorectal", "Lung"]), ancestries: JSON.stringify(["American Indian/Alaska Native"]), status: "approved", contactEmail: "genomics@navajo-nsn.gov" },
      { institutionName: "Howard University Cancer Center", location: "Washington, DC", sampleCount: 312, cancerTypes: JSON.stringify(["Prostate", "Breast", "Colorectal", "Multiple Myeloma"]), ancestries: JSON.stringify(["African", "Hispanic/Latino", "European"]), status: "integrated", contactEmail: "biobank@howard.edu" },
      { institutionName: "Pine Ridge Health Board", location: "Pine Ridge, SD", sampleCount: 28, cancerTypes: JSON.stringify(["Lung", "Colorectal"]), ancestries: JSON.stringify(["American Indian/Alaska Native"]), status: "reviewed", contactEmail: "research@pineridgehealth.org" },
      { institutionName: "University of Puerto Rico CCC", location: "San Juan, PR", sampleCount: 189, cancerTypes: JSON.stringify(["Breast", "Prostate", "Colorectal"]), ancestries: JSON.stringify(["Hispanic/Latino"]), status: "approved", contactEmail: "biobank@rcm.upr.edu" },
      { institutionName: "Rural Alabama Oncology Network", location: "Tuscaloosa, AL", sampleCount: 156, cancerTypes: JSON.stringify(["Lung", "Colorectal", "Prostate"]), ancestries: JSON.stringify(["African", "European", "Hispanic/Latino"]), status: "submitted", contactEmail: "raon@ruralal.org" },
      { institutionName: "Pacific Islands Cancer Initiative", location: "Honolulu, HI", sampleCount: 67, cancerTypes: JSON.stringify(["Breast", "Lung", "Liver"]), ancestries: JSON.stringify(["Pacific Islander", "East Asian"]), status: "reviewed", contactEmail: "pici@hawaii.edu" },
      { institutionName: "Appalachian Community Cancer Center", location: "Lexington, KY", sampleCount: 423, cancerTypes: JSON.stringify(["Lung", "Breast", "Colorectal"]), ancestries: JSON.stringify(["European", "African", "Hispanic/Latino"]), status: "approved", contactEmail: "accbio@appstate.org" },
      { institutionName: "South Texas Biobank Collaborative", location: "San Antonio, TX", sampleCount: 278, cancerTypes: JSON.stringify(["Liver", "Colorectal", "Cervical"]), ancestries: JSON.stringify(["Hispanic/Latino", "European", "African"]), status: "integrated", contactEmail: "stbc@uthscsa.edu" },
    ],
  });

  console.log("Seed data complete");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
