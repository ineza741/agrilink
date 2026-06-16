import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Droplets,
  FlaskConical,
  Info,
  Leaf,
  MapPinned,
  RadioTower,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFarmerData } from "../../context/FarmerDataContext";

const IRRIGATION_STORAGE_KEY = "agri-feed-irrigation-module-v1";

function formatRwf(value) {
  return `RWF ${Math.round(Number(value) || 0).toLocaleString()}`;
}

function createDefaultFarm() {
  return {
    id: "irrigation-default-farm",
    name: "Primary Irrigation Plot",
    region: "Northern Highlands",
    sizeHectares: 12,
    landType: "Loamy",
    irrigationType: "Drip Irrigation",
    primaryCrop: "Maize",
    location: { lat: -1.94, lng: 29.87, mapX: 50, mapY: 50, label: "Primary irrigation block" },
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function hashFarm(farm) {
  return (
    Math.round(Math.abs(Number(farm?.location?.lat || 0)) * 100) +
    Math.round(Math.abs(Number(farm?.location?.lng || 0)) * 100) +
    Math.round(Number(farm?.sizeHectares || 0)) * 2 +
    Number(farm?.location?.mapX || 0) +
    Number(farm?.location?.mapY || 0)
  );
}

function loadStoredState() {
  try {
    return JSON.parse(localStorage.getItem(IRRIGATION_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveStoredState(state) {
  localStorage.setItem(IRRIGATION_STORAGE_KEY, JSON.stringify(state));
}

function buildCalendarGrid(currentDate) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPreviousMonth = new Date(year, month, 0).getDate();
  const cells = [];

  for (let index = firstDay - 1; index >= 0; index -= 1) {
    cells.push({ day: daysInPreviousMonth - index, currentMonth: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ day, currentMonth: true });
  }

  while (cells.length < 35) {
    cells.push({ day: cells.length - (firstDay + daysInMonth) + 1, currentMonth: false });
  }

  return cells;
}

function calculateAdvisory({
  farm,
  soilMoisture,
  targetYield,
  fertilizerType,
  budget,
  cropStage,
  reminderDate,
  sensorMode,
}) {
  const seed = hashFarm(farm);
  const cropFactorMap = {
    Maize: 1.15,
    Potato: 1.12,
    Beans: 0.82,
    Soybean: 0.9,
    Wheat: 0.86,
  };
  const cropFactor = cropFactorMap[farm.primaryCrop] || 1;
  const weatherTemp = 22 + (seed % 9);
  const humidity = clamp(50 + (seed % 28), 42, 88);
  const expectedRainfall = clamp(8 + (seed % 26), 3, 34);
  const evapotranspiration = Number((3.4 + cropFactor * 1.1 + (weatherTemp - humidity / 12) * 0.08).toFixed(1));
  const moisture = clamp(Number(soilMoisture || 0), 8, 90);
  const waterRequirement = Math.round(
    clamp(
      farm.sizeHectares * cropFactor * 220 + evapotranspiration * 135 - expectedRainfall * 9 + (55 - moisture) * 18,
      1100,
      8600
    )
  );

  const nitrogenBase = targetYield * 10.5 * cropFactor;
  const phosphorusBase = targetYield * 4.2 * cropFactor;
  const potassiumBase = targetYield * 5.5 * cropFactor;
  const fertilizerMultiplier =
    fertilizerType === "Organic Blend" ? 0.88 : fertilizerType === "Precision NPK" ? 1 : 0.94;

  const nutrients = [
    {
      label: "Nitrogen (N)",
      value: `${Math.round(nitrogenBase * fertilizerMultiplier)} kg/ha`,
      width: `${clamp(Math.round((nitrogenBase / 150) * 100), 25, 92)}%`,
    },
    {
      label: "Phosphorus (P)",
      value: `${Math.round(phosphorusBase * fertilizerMultiplier)} kg/ha`,
      width: `${clamp(Math.round((phosphorusBase / 75) * 100), 20, 78)}%`,
    },
    {
      label: "Potassium (K)",
      value: `${Math.round(potassiumBase * fertilizerMultiplier)} kg/ha`,
      width: `${clamp(Math.round((potassiumBase / 95) * 100), 22, 84)}%`,
    },
  ];

  const waterCost = Math.round(waterRequirement * 0.085);
  const fertilizerCost = Math.round((nitrogenBase + phosphorusBase + potassiumBase) * 3.8 * fertilizerMultiplier);
  const laborCost = Math.round(240 + farm.sizeHectares * 8);
  const totalCost = waterCost + fertilizerCost + laborCost;
  const budgetFit = totalCost <= budget ? "Within Budget" : "Budget Pressure";
  const moistureStatus = moisture < 30 ? "Low" : moisture < 55 ? "Moderate" : "Healthy";
  const reminderLabel = reminderDate
    ? new Intl.DateTimeFormat("en-ZA", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(reminderDate))
    : "Not set";

  const recommendations = [
    moisture < 30
      ? "Run shorter evening irrigation cycles to reduce evapotranspiration losses."
      : "Keep moisture checks aligned to the scheduled irrigation windows.",
    expectedRainfall > 20
      ? "Reduce one irrigation pulse because rainfall probability is already supportive."
      : "Maintain full irrigation pulse because rainfall support remains limited.",
    budgetFit === "Budget Pressure"
      ? "Switch to split fertilizer application to spread input cost over the month."
      : "Current irrigation and fertilizer plan fits within the declared operating budget.",
  ];

  const reminderDays = [];
  const reminderBase = reminderDate ? new Date(reminderDate) : new Date();
  for (let i = 0; i < 7; i += 1) {
    reminderDays.push(reminderBase.getDate() + i * 3);
  }

  return {
    weatherTemp,
    humidity,
    expectedRainfall,
    evapotranspiration,
    waterRequirement,
    nutrients,
    costs: [
      { label: "Water Usage (Pumping)", value: formatRwf(waterCost) },
      { label: `Fertilizer (${fertilizerType})`, value: formatRwf(fertilizerCost) },
      { label: "Application Labor", value: formatRwf(laborCost) },
    ],
    totalCost,
    budgetFit,
    moistureStatus,
    recommendations,
    reminderLabel,
    reminderDays,
    sensorMode,
    cropStage,
    fieldMoistureAverage: moisture,
  };
}

export function IrrigationPage() {
  const { currentFarms } = useFarmerData();
  const farms = currentFarms.length ? currentFarms : [createDefaultFarm()];
  const stored = useMemo(() => loadStoredState(), []);
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [selectedFarmId, setSelectedFarmId] = useState(farms[0]?.id || "irrigation-default-farm");
  const [sensorMode, setSensorMode] = useState(stored.sensorMode || "manual");
  const [soilMoisture, setSoilMoisture] = useState(stored.soilMoisture || "28");
  const [targetYield, setTargetYield] = useState(stored.targetYield || "12.5");
  const [fertilizerType, setFertilizerType] = useState(stored.fertilizerType || "Precision NPK");
  const [budget, setBudget] = useState(stored.budget || "2200");
  const [cropStage, setCropStage] = useState(stored.cropStage || "Vegetative");
  const [reminderDate, setReminderDate] = useState(stored.reminderDate || "");
  const [savedReminders, setSavedReminders] = useState(stored.reminders || []);

  useEffect(() => {
    saveStoredState({
      sensorMode,
      soilMoisture,
      targetYield,
      fertilizerType,
      budget,
      cropStage,
      reminderDate,
      reminders: savedReminders,
    });
  }, [budget, cropStage, fertilizerType, reminderDate, savedReminders, sensorMode, soilMoisture, targetYield]);

  useEffect(() => {
    if (!farms.some((farm) => farm.id === selectedFarmId)) {
      setSelectedFarmId(farms[0]?.id || "irrigation-default-farm");
    }
  }, [farms, selectedFarmId]);

  const selectedFarm = useMemo(
    () => farms.find((farm) => farm.id === selectedFarmId) || farms[0],
    [farms, selectedFarmId]
  );

  const advisory = useMemo(
    () =>
      calculateAdvisory({
        farm: selectedFarm,
        soilMoisture: Number(soilMoisture),
        targetYield: Number(targetYield),
        fertilizerType,
        budget: Number(budget),
        cropStage,
        reminderDate,
        sensorMode,
      }),
    [budget, cropStage, fertilizerType, reminderDate, selectedFarm, sensorMode, soilMoisture, targetYield]
  );

  const monthKey = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, "0")}`;
  const irrigationDays = useMemo(() => {
    const seeded = new Set(
      advisory.reminderDays
        .filter((day) => day > 0 && day <= new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate())
        .map((day) => day)
    );

    savedReminders
      .filter((item) => item.monthKey === monthKey)
      .forEach((item) => seeded.add(item.day));

    return seeded;
  }, [advisory.reminderDays, calendarDate, monthKey, savedReminders]);

  const calendarCells = useMemo(() => buildCalendarGrid(calendarDate), [calendarDate]);
  const calendarLabel = calendarDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const toggleReminder = (day) => {
    if (!day.currentMonth) return;
    setSavedReminders((current) => {
      const exists = current.some((item) => item.monthKey === monthKey && item.day === day.day);
      if (exists) {
        return current.filter((item) => !(item.monthKey === monthKey && item.day === day.day));
      }
      return [...current, { monthKey, day: day.day, farmId: selectedFarm.id }];
    });
  };

  const addReminderFromDate = () => {
    if (!reminderDate) return;
    const date = new Date(reminderDate);
    const reminderMonthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const reminderDay = date.getDate();
    setSavedReminders((current) => {
      const exists = current.some((item) => item.monthKey === reminderMonthKey && item.day === reminderDay);
      return exists ? current : [...current, { monthKey: reminderMonthKey, day: reminderDay, farmId: selectedFarm.id }];
    });
  };

  return (
    <section className="management-page prototype-irrigation-page">
      <div className="page-title-block prototype-irrigation-title">
        <h1>Irrigation &amp; Fertilizer Planning</h1>
        <p>
          Smart irrigation scheduling, fertilizer optimization, moisture monitoring, and budget-aware
          input planning for each registered farm.
        </p>
      </div>

      <div className="prototype-irrigation-toolbar">
        <label className="prototype-irrigation-toolbar-field">
          <span>Active farm</span>
          <select value={selectedFarmId} onChange={(event) => setSelectedFarmId(event.target.value)}>
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name} - {farm.region}
              </option>
            ))}
          </select>
        </label>

        <label className="prototype-irrigation-toolbar-field">
          <span>Reminder date</span>
          <div className="prototype-irrigation-reminder-inline">
            <input type="date" value={reminderDate} onChange={(event) => setReminderDate(event.target.value)} />
            <button type="button" onClick={addReminderFromDate}>
              <Clock3 size={15} />
              <span>Add Reminder</span>
            </button>
          </div>
        </label>
      </div>

      <div className="prototype-irrigation-grid">
        <div className="prototype-irrigation-main">
          <article className="prototype-panel irrigation-calendar-panel">
            <div className="prototype-irrigation-panel-head">
              <h2>
                <CalendarDays size={20} />
                <span>Irrigation Scheduler</span>
              </h2>

              <div className="irrigation-calendar-nav">
                <button
                  type="button"
                  className="calendar-nav-button"
                  aria-label="Previous month"
                  onClick={() => setCalendarDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                >
                  <ChevronLeft size={16} />
                </button>
                <strong>{calendarLabel}</strong>
                <button
                  type="button"
                  className="calendar-nav-button"
                  aria-label="Next month"
                  onClick={() => setCalendarDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="irrigation-calendar">
              <div className="irrigation-calendar-weekdays">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>

              <div className="irrigation-calendar-grid">
                {calendarCells.map((cell, index) => (
                  <button
                    type="button"
                    key={`${calendarLabel}-${cell.day}-${index}`}
                    onClick={() => toggleReminder(cell)}
                    className={
                      irrigationDays.has(cell.day) && cell.currentMonth
                        ? "irrigation-day scheduled"
                        : cell.currentMonth
                          ? "irrigation-day"
                          : "irrigation-day muted"
                    }
                  >
                    <span>{cell.day}</span>
                    {irrigationDays.has(cell.day) && cell.currentMonth ? <i /> : null}
                  </button>
                ))}
              </div>
            </div>

            <div className="irrigation-calendar-legend">
              <span><i className="tone-blue" /> Scheduled Irrigation / Reminder</span>
              <span><i className="tone-muted" /> No Action Required</span>
            </div>
          </article>

          <article className="prototype-panel irrigation-calculator-panel">
            <div className="prototype-irrigation-panel-head">
              <h2>
                <FlaskConical size={20} />
                <span>Fertilizer Calculator</span>
              </h2>
            </div>

            <div className="irrigation-calculator-grid functional">
              <div className="irrigation-form-stack">
                <label>
                  <span>Target Yield (Metric Tons/Hectare)</span>
                  <input type="number" step="0.1" value={targetYield} onChange={(event) => setTargetYield(event.target.value)} />
                </label>

                <label>
                  <span>Crop Stage</span>
                  <select value={cropStage} onChange={(event) => setCropStage(event.target.value)}>
                    <option>Establishment</option>
                    <option>Vegetative</option>
                    <option>Flowering</option>
                    <option>Grain Fill</option>
                  </select>
                </label>

                <label>
                  <span>Fertilizer Type</span>
                  <select value={fertilizerType} onChange={(event) => setFertilizerType(event.target.value)}>
                    <option>Precision NPK</option>
                    <option>Organic Blend</option>
                    <option>Balanced Granular Mix</option>
                  </select>
                </label>

                <label>
                  <span>Input Budget (RWF)</span>
                  <input type="number" value={budget} onChange={(event) => setBudget(event.target.value)} />
                </label>

                <button type="button" className="profile-prototype-button primary irrigation-action-button">
                  <FlaskConical size={16} />
                  <span>Recalculate Advisory</span>
                </button>
              </div>

              <div className="irrigation-nutrient-card">
                <h3>Recommended Nutrients</h3>
                <div className="irrigation-nutrient-list">
                  {advisory.nutrients.map((row) => (
                    <div key={row.label} className="irrigation-nutrient-row">
                      <div className="irrigation-nutrient-label">
                        <span>{row.label}</span>
                        <strong>{row.value}</strong>
                      </div>
                      <div className="irrigation-nutrient-track">
                        <div className="irrigation-nutrient-fill" style={{ width: row.width }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </article>

          <article className="prototype-panel irrigation-sensor-panel">
            <div className="prototype-irrigation-panel-head">
              <h2>
                <RadioTower size={20} />
                <span>Soil Moisture Tracker</span>
              </h2>
            </div>

            <div className="irrigation-sensor-controls">
              <div className="irrigation-sensor-mode">
                <button
                  type="button"
                  className={sensorMode === "manual" ? "active" : ""}
                  onClick={() => setSensorMode("manual")}
                >
                  Manual Input
                </button>
                <button
                  type="button"
                  className={sensorMode === "sensor" ? "active" : ""}
                  onClick={() => setSensorMode("sensor")}
                >
                  IoT Sensor Mode
                </button>
              </div>

              <label className="irrigation-sensor-input">
                <span>Soil moisture (%)</span>
                <input
                  type="range"
                  min="8"
                  max="90"
                  value={soilMoisture}
                  onChange={(event) => setSoilMoisture(event.target.value)}
                />
                <strong>{soilMoisture}% · {advisory.moistureStatus}</strong>
              </label>
            </div>

            <div className="irrigation-guidance-grid">
              <div className="irrigation-guidance-card">
                <MapPinned size={18} />
                <div>
                  <strong>Smart ET scheduling</strong>
                  <p>Evapotranspiration is {advisory.evapotranspiration} mm/day for {selectedFarm.name}.</p>
                </div>
              </div>
              <div className="irrigation-guidance-card">
                <Leaf size={18} />
                <div>
                  <strong>Water conservation</strong>
                  <p>{advisory.recommendations[1]}</p>
                </div>
              </div>
            </div>
          </article>
        </div>

        <div className="prototype-irrigation-side">
          <article className="irrigation-water-card">
            <span>Water Requirement Estimate</span>
            <strong>{advisory.waterRequirement.toLocaleString()} <small>m³/hectare</small></strong>
            <p>
              Based on {selectedFarm.primaryCrop || "current crop"} stage, evapotranspiration of {advisory.evapotranspiration} mm/day,
              and expected rainfall of {advisory.expectedRainfall} mm.
            </p>
            <div className="irrigation-water-note">
              <Info size={18} />
              <span>{advisory.recommendations[0]}</span>
            </div>
          </article>

          <article className="prototype-panel irrigation-cost-card">
            <div className="prototype-irrigation-panel-head compact">
              <h2>
                <Wallet size={20} />
                <span>Cost Analysis</span>
              </h2>
            </div>

            <div className="irrigation-cost-list">
              {advisory.costs.map((row) => (
                <div key={row.label} className="irrigation-cost-row">
                  <span>{row.label}</span>
                  <strong>{row.value}</strong>
                </div>
              ))}
            </div>

            <div className="irrigation-total-row">
              <span>Estimated Total</span>
              <strong>{formatRwf(advisory.totalCost)}</strong>
            </div>

            <div className={`irrigation-budget-chip ${advisory.budgetFit === "Within Budget" ? "good" : "warning"}`}>
              {advisory.budgetFit}
            </div>

            <button type="button" className="irrigation-outline-button">
              View Detailed Breakdown
            </button>
          </article>

          <article className="irrigation-satellite-card">
            <div className="irrigation-satellite-head">
              <h3>Field Moisture &amp; Reminder Summary</h3>
              <span>{sensorMode === "sensor" ? "Sensor-Linked" : "Manual Tracking"}</span>
              <div className="irrigation-satellite-metrics">
                <div>
                  <strong>{advisory.fieldMoistureAverage}%</strong>
                  <small>Avg Moisture</small>
                </div>
                <div>
                  <strong className={advisory.moistureStatus === "Low" ? "low" : ""}>{advisory.moistureStatus}</strong>
                  <small>Status</small>
                </div>
              </div>
            </div>

            <div className="irrigation-satellite-map">
              <div className="irrigation-satellite-grid" />
              <div className="irrigation-satellite-label">Next reminder: {advisory.reminderLabel}</div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
