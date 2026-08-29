import "./DynamicWuxingPoster.css";

type Branch = {
  name: string;
  next: string;
  calculation?: string;
  sourcePositions?: number[];
};
type Validation = {
  sourcePeriod: number;
  targetPeriod: number;
  branches: {
    name: string;
    calculation: string;
    result: string;
    targetPositions?: number[];
  }[];
  actualNumber: string;
  actualAnimal: string;
  actualElement: string;
  hit: boolean;
  targetPositions?: number[];
};
type Method = {
  label: string;
  sourceKey: string;
  next: string[];
  recentStreak: number;
  recent30Hits: number;
  branches: Branch[];
  history?: Validation[];
  formulaId?: string;
  verification?: {
    hit: boolean;
    actualNumber: string;
    actualAnimal: string;
    actualElement: string;
  };
};
type Draw = {
  period: number;
  displayPeriod?: string;
  date?: string;
  numbers: { number: string; animal: string; element: string }[];
};

const colors: Record<string, string> = {
  金: "#b78934",
  木: "#24814a",
  水: "#247cae",
  火: "#c73538",
  土: "#85542f",
  家肖: "#bd8127",
  野肖: "#278452",
};

const conciseCalculation = (text: string) =>
  text
    .replace(/([＝=]\s*)(\d+)[，,、\s]+\2岁属/g, "$1$2属")
    .replace(/(\d+)岁属/g, "$1属")
    .replace(/[，,、]\s*属/g, "属");

export default function DynamicWuxingPoster({
  issue,
  item,
  draws = [],
  mode = "wuxing",
  lotteryName = "澳门六合彩",
}: {
  issue: string;
  item: Method;
  draws?: Draw[];
  mode?: "wuxing" | "jiaye" | "pingte" | "pingte2" | "generic";
  lotteryName?: string;
}) {
  const compactForecast = true;
  const isPingteMode = mode === "pingte" || mode === "pingte2";
  const sourcePositions = new Set(
    [...item.sourceKey, ...item.branches.flatMap((branch) => [...branch.name])]
      .join("")
      .match(/平[1-6]码|特码/g) || [],
  );
  const orderedDraws = draws.slice().sort((a, b) => b.period - a.period);
  const validations = (item.history || [])
    .slice()
    .sort((a, b) => b.targetPeriod - a.targetPeriod);
  const boardOffset = item.verification ? 58 : 178;
  const rowHeight = item.branches.length > 1 ? 132 : 104;
  const columnX = (position: number) => 112 + (position + 0.5) * 126;
  const rowY = (period: number) =>
    boardOffset +
    (orderedDraws.findIndex((draw) => draw.period === period) + 0.5) *
      rowHeight;
  return (
    <section
      className={`dynamic-poster ${mode}${mode === "wuxing" ? " pingte" : ""}`}
      aria-label={`${issue}期${item.label}动态公式图`}
    >
      <div className="dynamic-poster-watermark" aria-hidden="true">
        六合公式库　六合公式库　六合公式库
        <br />
        六合公式库　六合公式库　六合公式库
        <br />
        六合公式库　六合公式库　六合公式库
      </div>
      <header>
        <h2>
          {lotteryName}第{issue}期 · {item.sourceKey}
          {item.label}
        </h2>
      </header>
      <div className="wuxing-board-wrap">
        {draws.length > 0 && (
          <div className="wuxing-line-board">
            <div className="wuxing-board-head">
              <b>期号</b>
              {[
                "平1码",
                "平2码",
                "平3码",
                "平4码",
                "平5码",
                "平6码",
                "特码",
              ].map((label) => (
                <b key={label}>{label}</b>
              ))}
            </div>
            {!item.verification && (
              <div className="wuxing-forecast-row">
                <strong>
                  {issue}期{mode !== "jiaye" && <small>下期预测</small>}
                </strong>
                <div>
                  {mode !== "jiaye" && (
                    <span>{isPingteMode ? "平特参考" : "五行参考"}</span>
                  )}
                  {mode !== "jiaye" &&
                    item.next.map((value) => (
                      <b
                        key={value}
                        style={{ backgroundColor: colors[value] || "#9b772e" }}
                      >
                        {value}
                      </b>
                    ))}
                </div>
              </div>
            )}
            {orderedDraws.map((draw, drawIndex) => (
              <div
                className="wuxing-board-row"
                style={{ height: rowHeight }}
                key={draw.period}
              >
                <strong>
                  {draw.displayPeriod ||
                    `${String(draw.period).padStart(3, "0")}期`}
                  <small>{draw.date || ""}</small>
                </strong>
                {draw.numbers.map((value, index) => {
                  const label = index === 6 ? "特码" : `平${index + 1}码`;
                  const isPredictionSource =
                    !item.verification &&
                    drawIndex === 0 &&
                    sourcePositions.has(label);
                  const isSource =
                    isPredictionSource ||
                    (sourcePositions.has(label) &&
                      validations.some(
                        (entry) => entry.sourcePeriod === draw.period,
                      ));
                  const isTarget = validations.some(
                    (entry) =>
                      entry.hit &&
                      entry.targetPeriod === draw.period &&
                      (isPingteMode
                        ? entry.branches.some((branch) =>
                            branch.targetPositions?.includes(index + 1),
                          )
                        : index === 6),
                  );
                  return (
                    <span
                      className={`${isSource ? "picked " : ""}${isTarget ? "target " : ""}`}
                      key={`${draw.period}-${index}`}
                    >
                      <b>{value.number}</b>
                      <small>
                        {value.animal} · {value.element}
                      </small>
                    </span>
                  );
                })}
              </div>
            ))}
            <svg
              className="wuxing-board-lines"
              viewBox={`0 0 1000 ${boardOffset + orderedDraws.length * rowHeight}`}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <marker
                  id="wuxing-arrow"
                  markerWidth="9"
                  markerHeight="9"
                  refX="8"
                  refY="4.5"
                  orient="auto"
                >
                  <path d="M0,0 L9,4.5 L0,9 Z" fill="#cf2f32" />
                </marker>
                <marker
                  id="prediction-arrow-head"
                  markerWidth="6"
                  markerHeight="6"
                  refX="5.2"
                  refY="3"
                  orient="auto"
                >
                  <path d="M0,0 L6,3 L0,6 Z" fill="#cf2f32" />
                </marker>
              </defs>
              {!item.verification &&
                orderedDraws[0] &&
                item.branches.flatMap((branch, branchIndex) =>
                  (branch.sourcePositions || []).map((position) => (
                    <path
                      className="prediction-arrow"
                      key={`prediction-${branchIndex}-${position}`}
                      d={`M ${columnX(position)} ${rowY(orderedDraws[0].period) - 18} C ${columnX(position)} 165, 430 138, 455 ${102 + branchIndex * 22}`}
                      markerEnd="url(#prediction-arrow-head)"
                    />
                  )),
                )}
              {validations.map((entry, index) => {
                const positions =
                  item.branches[index % item.branches.length]
                    ?.sourcePositions ||
                  item.branches[0]?.sourcePositions ||
                  [];
                const sy = rowY(entry.sourcePeriod);
                const ty = rowY(entry.targetPeriod);
                const targetPosition = isPingteMode
                  ? Math.max(0, (entry.targetPositions?.[0] || 7) - 1)
                  : 6;
                const tx = columnX(targetPosition);
                const joinX = tx - 56;
                const joinY = (sy + ty) / 2;
                const multi = entry.branches.length > 1;
                return (
                  <g key={`${entry.sourcePeriod}-${entry.targetPeriod}`}>
                    {isPingteMode ? (
                      entry.branches.flatMap((branch, branchIndex) => {
                        const branchSources =
                          item.branches[branchIndex]?.sourcePositions ||
                          positions;
                        const branchTargets = branch.targetPositions || [];
                        const branchTarget = branchTargets[0];
                        const branchTx =
                          branchTarget != null
                            ? columnX(branchTarget - 1)
                            : tx;
                        const labelY = joinY + (branchIndex === 0 ? -13 : 13);
                        return branchSources.map((position) => (
                          <g key={`${branchIndex}-${position}`}>
                            <path
                              d={`M ${columnX(position)} ${sy - 18} C ${columnX(position)} ${labelY}, 470 ${labelY}, 540 ${labelY}`}
                            />
                            {entry.hit && branchTarget != null && (
                              <path
                                d={`M 700 ${labelY} C 900 ${labelY}, ${branchTx} ${ty + 28}, ${branchTx} ${ty + 7}`}
                                markerEnd="url(#wuxing-arrow)"
                              />
                            )}
                          </g>
                        ));
                      })
                    ) : (
                      <>
                        {positions.map((position) => (
                          <path
                            key={position}
                            d={`M ${columnX(position)} ${sy - 18} C ${columnX(position)} ${joinY + 18}, ${joinX - 28} ${joinY + 12}, ${joinX} ${joinY}`}
                          />
                        ))}
                        {entry.hit && (
                          <path
                            d={`M ${joinX} ${joinY} C ${joinX + 28} ${joinY - 8}, ${tx} ${ty + 30}, ${tx} ${ty + 7}`}
                            markerEnd="url(#wuxing-arrow)"
                          />
                        )}
                      </>
                    )}
                    <foreignObject
                      x="432"
                      y={joinY - (multi ? 28 : 18)}
                      width="425"
                      height={multi ? 58 : 42}
                    >
                      <div
                        className={`wuxing-line-label${multi ? " multi" : ""}`}
                      >
                        <span>
                          {entry.branches.map((branch, branchIndex) => (
                            <small key={branchIndex}>
                              {conciseCalculation(branch.calculation)
                                .split(/[，,]/, 2)
                                .map((part, partIndex) => (
                                  <b key={partIndex}>{part.trim()}</b>
                                ))}
                            </small>
                          ))}
                        </span>
                        <i className={entry.hit ? "hit" : "miss"}>
                          {entry.hit ? "准" : "错"}
                        </i>
                      </div>
                    </foreignObject>
                  </g>
                );
              })}
            </svg>
          </div>
        )}
        {!item.verification && (
          <div
            className={`wuxing-formula-note${item.branches.length > 1 ? " multi" : ""}`}
          >
            <b>公式算法</b>
            <div className="formula-pairs">
              {item.branches.map((branch, index) => {
                const result = branch.next || item.next[index];
                return (
                  <div className="formula-pair" key={`${branch.name}-${index}`}>
                    <span>{conciseCalculation(branch.calculation || branch.name)}</span>
                    {compactForecast && result && (
                      <strong
                        className="prediction-result"
                        style={{ backgroundColor: colors[result] || "#9b772e" }}
                      >
                        {result}
                      </strong>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <footer>
        <span>公式编号：{item.formulaId || "自动编号"}</span>
        <strong>近30期命中 {item.recent30Hits} 次</strong>
        <em>仅供娱乐参考</em>
      </footer>
    </section>
  );
}
