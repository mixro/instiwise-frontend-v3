import type { Schema } from "@/lib/contract/types";

/*
 * Agreement terms in English and Swahili (ADR 0004; decided 2026-10-25: staff
 * write both, no machine translation). The seeds are written in English and look
 * their Swahili copy up here, so every seeded term has both languages.
 */

export type Term = Schema<"BilingualText">;

const SWAHILI: Record<string, string> = {
  // Smart irrigation controller
  "Design and build the controller on an ESP32 board":
    "Kubuni na kutengeneza kidhibiti kwenye bodi ya ESP32",
  "Four capacitive soil-moisture sensors, one per bed":
    "Vihisi vinne vya unyevu wa udongo, kimoja kwa kila tuta",
  "Ultrasonic tank level sensor with SMS alerts through a GSM module":
    "Kihisi cha ultrasonic cha kiwango cha maji kwenye tanki, chenye arifa za SMS kupitia moduli ya GSM",
  "Project report and wiring diagram": "Ripoti ya mradi na mchoro wa nyaya",
  "Plumbing and solenoid valve installation on the farm":
    "Ufungaji wa mabomba na vali za solenoid shambani",
  "Airtime for SMS": "Salio la muda wa maongezi kwa ajili ya SMS",
  "Deposit of TSh 600,000 before components are bought":
    "Malipo ya awali ya TSh 600,000 kabla ya kununua vifaa",
  "TSh 500,000 after the prototype demonstration": "TSh 500,000 baada ya maonyesho ya mfano",
  "The balance on delivery of the final report":
    "Salio linalobaki wakati wa kukabidhi ripoti ya mwisho",
  "Rain sensor that skips watering when it rains":
    "Kihisi cha mvua kinachoacha kumwagilia mvua inaponyesha",
  "SMS alerts to a second phone number": "Arifa za SMS kwa namba ya pili ya simu",
  "20 W solar panel with charge controller and battery":
    "Paneli ya jua ya W 20 yenye kidhibiti cha chaji na betri",
  // Solar water pump report
  "Write the final report (five chapters)": "Kuandika ripoti ya mwisho (sura tano)",
  "Prepare the presentation": "Kuandaa wasilisho",
  "Build a scale model": "Kutengeneza modeli ndogo ya mfano",
  "Printing and binding": "Uchapishaji na ufungaji wa kitabu",
  "Half before writing starts": "Nusu kabla ya kuanza kuandika",
  "Half on delivery": "Nusu wakati wa kukabidhi",
  // RFID attendance system
  "RFID reader on an Arduino with a real-time clock":
    "Kisomaji cha RFID kwenye Arduino chenye saa halisi",
  "50 RFID cards": "Kadi 50 za RFID",
  "Simple web page listing each day's arrivals":
    "Ukurasa rahisi wa wavuti unaoorodhesha waliofika kila siku",
  "Project report": "Ripoti ya mradi",
  "Internet connection at the school": "Muunganisho wa intaneti shuleni",
  "More than 50 cards": "Kadi zaidi ya 50",
  "Deposit of TSh 400,000 after you accept this agreement":
    "Malipo ya awali ya TSh 400,000 baada ya kukubali makubaliano haya",
  "The balance on delivery": "Salio linalobaki wakati wa kukabidhi",
  // Biogas digester monitor
  "Gas pressure sensor on the digester outlet":
    "Kihisi cha shinikizo la gesi kwenye bomba la kutolea gesi la mtambo",
  "LCD display of pressure and daily gas use":
    "Skrini ya LCD inayoonyesha shinikizo na matumizi ya gesi kwa siku",
  "Plumbing changes to the digester": "Mabadiliko ya mabomba kwenye mtambo wa biogesi",
  "Half before work starts": "Nusu kabla ya kazi kuanza",
  "MQ-4 methane sensor with buzzer alarm": "Kihisi cha methani cha MQ-4 chenye kengele",
  // Cookstove logger (a draft)
  "Thermocouple sensor on the stove": "Kihisi cha joto (thermocouple) kwenye jiko",
  "SD card logger with a daily summary": "Kirekodi cha kadi ya SD chenye muhtasari wa kila siku",
  "Repairs to the stove": "Matengenezo ya jiko",
  // Zawadi's clients
  "Weather station": "Kituo cha hali ya hewa",
  Display: "Skrini ya kuonyesha",
  Report: "Ripoti",
  Slides: "Slaidi za wasilisho",
};

/** Seed terms in both languages. Throws if a term has no reviewed Swahili copy. */
export function terms(...english: string[]): Term[] {
  return english.map((en) => {
    const sw = SWAHILI[en];
    if (!sw) throw new Error(`No Swahili copy for the seed term "${en}"`);
    return { en, sw };
  });
}
