import { createServer } from "http";
import { Server } from "socket.io";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

io.listen(3004);

const GENES = [
  "BRCA1", "BRCA2", "TP53", "EGFR", "KRAS", "PIK3CA", "SPOP",
  "ATM", "PTEN", "CDH1", "PALB2", "CHEK2", "RAD51C", "RAD51D",
  "BARD1", "MLH1", "MSH2", "MSH6", "PMS2", "APC", "BRAF",
  "NRAS", "IDH1", "IDH2", "TERT", "FGFR3", "RET", "ALK",
  "ROS1", "NTRK1", "HER2", "MET", "AKT1", "STK11", "SMAD4",
];

const CLASSIFICATIONS = ["Pathogenic", "Likely Pathogenic", "VUS", "Likely Benign", "Benign"];
const POPULATIONS = [
  "European", "African", "Hispanic/Latino", "East Asian",
  "South Asian", "AI/AN", "Pacific Islander",
];
const CANCER_TYPES = [
  "Prostate Adenocarcinoma", "Colon Adenocarcinoma", "Breast Carcinoma",
  "Lung Adenocarcinoma", "Glioblastoma", "Pancreatic Adenocarcinoma",
  "Melanoma", "Ovarian Carcinoma", "Renal Cell Carcinoma",
];

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateVariant() {
  const gene = pick(GENES);
  const classification = pick(CLASSIFICATIONS);
  const popFreq = rand(0.001, 0.15);
  const refFreq = popFreq * rand(0.7, 2.5);
  const bias = Math.abs(popFreq - refFreq) / Math.max(refFreq, 0.001);
  const clampedBias = Math.min(bias, 0.98);
  const population = pick(POPULATIONS);

  return {
    id: `live-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    gene,
    variant: `rs${Math.floor(rand(10000000, 99999999))}`,
    classification,
    populationFrequency: parseFloat(popFreq.toFixed(4)),
    referenceFrequency: parseFloat(Math.max(0.0001, refFreq).toFixed(4)),
    ancestryBiasScore: parseFloat(clampedBias.toFixed(3)),
    population,
    cancerType: pick(CANCER_TYPES),
    timestamp: new Date().toISOString(),
  };
}

io.on("connection", (socket) => {
  console.log(`[Live Stream] Client connected: ${socket.id}`);
  socket.on("disconnect", () => {
    console.log(`[Live Stream] Client disconnected: ${socket.id}`);
  });
});

setInterval(() => {
  const variant = generateVariant();
  io.emit("mutation", variant);
}, 1200);

setInterval(() => {
  const summary = {
    type: "summary",
    totalProcessed: Math.floor(rand(100, 900)),
    highBiasDetected: Math.floor(rand(30, 200)),
    criticalAlerts: Math.floor(rand(5, 25)),
    populationsMonitored: 7,
    activeStreams: 1,
  };
  io.emit("summary", summary);
}, 5000);

console.log("[Live Stream] AncestralMT mutation stream service on port 3004");
