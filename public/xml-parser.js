(function () {
  function child(parent, name) {
    if (!parent) return null;

    return (
      Array.from(parent.children).find((node) => node.localName === name) ||
      null
    );
  }

  function text(parent, path) {
    if (!parent) return "";

    // Спочатку шукаємо повну назву XML-елемента
    const direct = child(parent, path);

    if (direct) {
      return direct.textContent.trim();
    }

    // Якщо елемент вкладений, розбираємо шлях через крапку
    const parts = path.split(".");
    let current = parent;

    for (const part of parts) {
      current = child(current, part);

      if (!current) return "";
    }

    return current.textContent.trim();
  }

  function parse(xmlText) {
    const doc = new DOMParser().parseFromString(xmlText, "application/xml");
    if (doc.getElementsByTagName("parsererror").length) {
      throw new Error("Некоректний XML-файл.");
    }

    const root = doc.documentElement;
    if (root.localName !== "PlannedResourceSchedule_MarketDocument") {
      throw new Error(
        "Невірний формат XML. Очікується PlannedResourceSchedule_MarketDocument.",
      );
    }

    const sender = child(root, "sender_MarketParticipant.mRID");
    const interval = child(root, "schedule_Period.timeInterval");
    const end = text(interval, "end");
    const start = text(interval, "start");

    const series = {};
    const nodes = Array.from(
      root.getElementsByTagNameNS("*", "PlannedResource_TimeSeries"),
    );

    for (const node of nodes) {
      const businessType = text(node, "businessType");
      if (!businessType) continue;

      const period = child(node, "Series_Period");
      const points = period
        ? Array.from(period.getElementsByTagNameNS("*", "Point"))
        : [];
      const pointValues = new Map();

      for (const point of points) {
        const position = Number(text(point, "position"));
        const quantityText = text(point, "quantity");
        const quantity = Number(quantityText);
        if (
          Number.isInteger(position) &&
          position > 0 &&
          Number.isFinite(quantity)
        ) {
          pointValues.set(position, quantity);
        }
      }

      const hours = Array(24).fill(null);
      if (
        pointValues.size <= 24 &&
        pointValues.size > 0 &&
        !pointValues.has(25)
      ) {
        for (let hour = 0; hour < 24; hour++) {
          if (pointValues.has(hour + 1))
            hours[hour] = pointValues.get(hour + 1);
        }
      } else {
        for (let hour = 0; hour < 24; hour++) {
          const quarters = [];
          for (let quarter = 1; quarter <= 4; quarter++) {
            const position = hour * 4 + quarter;
            if (pointValues.has(position))
              quarters.push(pointValues.get(position));
          }
          if (quarters.length) {
            hours[hour] =
              quarters.reduce((sum, value) => sum + value, 0) / quarters.length;
          }
        }
      }

      const flowDirection = text(node, "flowDirection.direction") || "A01";

      const seriesKey =
        businessType === "A61" ? `A61_${flowDirection}` : businessType;

      series[seriesKey] = {
        enabled: true,
        hours,
        businessType,
        flowDirection,
      };
    }

    const dateMatch = (end || start).match(/^\d{4}-\d{2}-\d{2}/);
    const senderCodingScheme = sender
      ? sender.getAttribute("codingScheme") || "A01"
      : "A01";

    return {
      mRID: text(root, "sender_MarketParticipant.mRID"),
      senderCodingScheme,
      revisionNumber: text(root, "revisionNumber"),
      processType: text(root, "process.processType"),
      documentDate: dateMatch ? dateMatch[0] : "",
      series,
      senderRole: text(root, "sender_MarketParticipant.marketRole.type"),
      receiverMRID: text(root, "receiver_MarketParticipant.mRID"),
      receiverCodingScheme:
        (child(root, "receiver_MarketParticipant.mRID") || {}).getAttribute?.(
          "codingScheme",
        ) || "A01",
      receiverRole: text(root, "receiver_MarketParticipant.marketRole.type"),
      documentType: text(root, "type"),
      start,
      end,
      seriesCount: nodes.length,
    };
  }

  window.PRSXmlParser = { parse };
})();
