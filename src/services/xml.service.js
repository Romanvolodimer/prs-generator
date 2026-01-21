/* ===================== HELPERS ===================== */

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

function minusOneDay(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return d;
}

/* ===================== POINTS ===================== */
/**
 * 24 години → 96 Point (15 хв)
 * значення завжди з 1 знаком після коми
 */
function generatePoints(hours) {
  let position = 1;
  let xml = "";

  for (let hour = 0; hour < 24; hour++) {
    const value = Number(hours[hour] || 0).toFixed(1);

    for (let q = 0; q < 4; q++) {
      xml += `
                            <Point>
                                <position>${position}</position>
                                <quantity>${value}</quantity>
                            </Point>`;
      position++;
    }
  }

  return xml;
}

/* ===================== TIME SERIES ===================== */

const FLOW_DIRECTION_TYPES = ["A60", "A61", "A96"];

function generateTimeSeries({
  index,
  businessType,
  timeIntervalXML,
  hours,
  installationCode,
  registeredResource,
}) {
  const flowDirectionXML = FLOW_DIRECTION_TYPES.includes(businessType)
    ? `
                <flowDirection.direction>A01</flowDirection.direction>`
    : "";

  return `
            <PlannedResource_TimeSeries>
                <mRID>TS${index}</mRID>
                <businessType>${businessType}</businessType>
${flowDirectionXML}
                <product>8716867000016</product>
                <connecting_Domain.mRID codingScheme="A01">10Y1001C--000182</connecting_Domain.mRID>
                <registeredResource.mRID codingScheme="A01">${registeredResource}</registeredResource.mRID>
                <resourceProvider_MarketParticipant.mRID
                codingScheme="A01">${installationCode}</resourceProvider_MarketParticipant.mRID>
                <measurement_Unit.name>MAW</measurement_Unit.name>

                <Series_Period>
${timeIntervalXML}
                    <resolution>PT15M</resolution>
${generatePoints(hours)}
                </Series_Period>
            </PlannedResource_TimeSeries>`;
}

/* ===================== DOCUMENT ===================== */

export function generateXML(data) {
  const { mRID, revisionNumber, processType, documentDate, series } = data;

  const createdDateTime = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

  /* ===== DATE LOGIC ===== */
  const endDateObj = new Date(documentDate);
  const startDateObj = minusOneDay(endDateObj);

  const startDate = formatDate(startDateObj);
  const endDate = formatDate(endDateObj);

  /* ===== DOCUMENT MRID ===== */
  const documentMRID = `${mRID}-${endDate}`;

  /* ===== TIME INTERVAL ===== */
  const timeIntervalXML = `
                        <timeInterval>
                            <start>${startDate}T22:00Z</start>
                            <end>${endDate}T22:00Z</end>
                        </timeInterval>`;

  /* ===== TIME SERIES ===== */
  let seriesXML = "";
  let counter = 1;

  for (const [businessType, s] of Object.entries(series)) {
    if (!s.enabled) continue;

    seriesXML += generateTimeSeries({
      index: counter,
      businessType,
      timeIntervalXML,
      hours: s.hours,
      installationCode: mRID,
      registeredResource: data.registeredResource, // 👈
    });

    counter++;
  }

  /* ===== FINAL XML ===== */
  return `<?xml version="1.0" encoding="utf-8"?>

<PlannedResourceSchedule_MarketDocument
        xmlns="urn:iec62325.351:tc57wg16:451-7:plannedresourcescheduledocument:6:0"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="urn:iec62325.351:tc57wg16:451-7:plannedresourcescheduledocument:6:0 ../../xsd/iec62325-451-7-plannedressourceschedule_v6_0.xsd">

    <mRID>${documentMRID}</mRID>
    <revisionNumber>${revisionNumber}</revisionNumber>
    <type>A14</type>
    <process.processType>${processType}</process.processType>

    <sender_MarketParticipant.mRID
    codingScheme="A01">${mRID}</sender_MarketParticipant.mRID>
    <sender_MarketParticipant.marketRole.type>A27</sender_MarketParticipant.marketRole.type>

    <receiver_MarketParticipant.mRID codingScheme="A01">10X1001C--00001X</receiver_MarketParticipant.mRID>
    <receiver_MarketParticipant.marketRole.type>A04</receiver_MarketParticipant.marketRole.type>

    <createdDateTime>${createdDateTime}</createdDateTime>

    <schedule_Period.timeInterval>
        <start>${startDate}T22:00Z</start>
        <end>${endDate}T22:00Z</end>
    </schedule_Period.timeInterval>

${seriesXML}
</PlannedResourceSchedule_MarketDocument>`;
}
