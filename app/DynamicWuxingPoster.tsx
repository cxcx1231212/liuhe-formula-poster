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
  duplicateAnimal?: boolean;
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
  duplicatePrediction?: boolean;
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

const compactMultiCalculation = (text: string) =>
  conciseCalculation(text)
    .replace(/^(?:平[1-6]码|特码码?)(?:合数|尾数)?[：:]\s*/, "")
    .replace(/期合/g, "合")
    .replace(/\s+/g, "");

const additionValue = (text: string) => {
  const match = text.match(/[+＋]\s*(\d+)/);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
};

const sortByAddition = <T extends { calculation?: string; name: string }>(branches: T[]) =>
  branches
    .map((branch, index) => ({ branch, index }))
    .sort(
      (a, b) =>
        additionValue(a.branch.calculation || a.branch.name) -
          additionValue(b.branch.calculation || b.branch.name) ||
        a.index - b.index,
    )
    .map(({ branch }) => branch);

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
  mode?: "wuxing" | "jiaye" | "pingte" | "pingte2" | "generic" | "zodiac" | "fushi" | "kill";
  lotteryName?: string;
}) {
  const compactForecast = true;
  const isPingteMode = mode === "pingte" || mode === "pingte2" || mode === "fushi";
  const sourcePositions = new Set(
    [...item.sourceKey, ...item.branches.flatMap((branch) => [...branch.name])]
      .join("")
      .match(/平[1-6]码|特码/g) || [],
  );
  const orderedDraws = draws.slice().sort((a, b) => b.period - a.period);
  const validations = (item.history || [])
    .slice()
    .sort((a, b) => b.targetPeriod - a.targetPeriod);
  const genericMulti = (mode === "generic" || mode === "zodiac" || mode === "fushi" || mode === "kill") && item.branches.length > 2;
  const displayBranches = genericMulti
    ? sortByAddition(item.branches)
    : item.branches;
  const genericColumns = genericMulti
    ? mode === "kill"
      ? item.branches.length > 3 ? 2 : 1
      : item.branches.length === 3
      ? 3
      : item.branches.length >= 4
        ? 2
        : 1
    : 1;
  const genericRows = Math.ceil(item.branches.length / genericColumns);
  const historyColumns = genericMulti
    ? item.branches.length === 3
      ? 3
      : mode === "fushi" && item.branches.length >= 18
      ? 4
      : item.branches.length >= 18
      ? 4
      : item.branches.length >= 10
        ? 3
        : genericColumns
    : genericColumns;
  const historyRows = Math.ceil(item.branches.length / historyColumns);
  const forecastHeight = genericMulti
    ? mode === "kill"
      ? Math.max(150, genericRows * 34 + 58)
      : item.branches.length === 3
      ? 120
      : Math.max(150, genericRows * 22 + 54)
    : 120;
  const boardOffset = item.verification ? 58 : 58 + forecastHeight;
  const historyLabelHeight = historyRows * 32 + 24;
  const rowHeight = genericMulti
    ? Math.max(180, historyLabelHeight + 140)
    : item.branches.length > 1 ? 132 : 104;
  const columnX = (position: number) => 112 + (position + 0.5) * 126;
  const rowY = (period: number) =>
    boardOffset +
    (orderedDraws.findIndex((draw) => draw.period === period) + 0.5) *
      rowHeight;
  return (
    <section
      className={`dynamic-poster ${mode}${mode === "wuxing" ? " pingte" : ""}${genericMulti ? " generic-multi" : ""}${genericMulti && item.branches.length === 3 ? " generic-three" : ""}${genericMulti && item.branches.length === 6 ? " generic-six" : ""}`}
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
              <div className="wuxing-forecast-row" style={{height: forecastHeight}}>
                <strong>
                  {issue}期{mode !== "jiaye" && <small>下期预测</small>}
                </strong>
                <div>
                  {mode !== "jiaye" && (
                    <span>{item.duplicatePrediction ? "本期重肖" : mode === "fushi" ? "复式参考" : isPingteMode ? "平特参考" : mode === "zodiac" ? "生肖参考" : "五行参考"}</span>
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
                (genericMulti
                  ? [...new Set(item.branches.flatMap(branch=>branch.sourcePositions||[]))].map(position=>({position,branchIndex:0}))
                  : item.branches.flatMap((branch, branchIndex)=>(branch.sourcePositions||[]).map(position=>({position,branchIndex}))))
                  .map(({position,branchIndex}) => (
                    <path
                      className="prediction-arrow"
                      key={`prediction-${branchIndex}-${position}`}
                      d={genericMulti
                        ? item.branches.length === 3
                          ? `M ${columnX(position)} ${rowY(orderedDraws[0].period) - 18} C ${columnX(position)} 150, 345 112, 300 102`
                          : `M ${columnX(position)} ${rowY(orderedDraws[0].period) - 18} C ${columnX(position)} 225, 345 205, 300 190`
                        : `M ${columnX(position)} ${rowY(orderedDraws[0].period) - 18} C ${columnX(position)} 165, 430 138, 455 ${102 + branchIndex * 22}`}
                      markerEnd="url(#prediction-arrow-head)"
                    />
                  ))}
              {validations.map((entry, index) => {
                // A formula keeps the same source positions across every
                // historical period. Do not rotate branches by history index:
                // that made multi-result kill formulas lose or misplace lines.
                const positions = genericMulti
                  ? [
                      ...new Set(
                        item.branches.flatMap(
                          (branch) => branch.sourcePositions || [],
                        ),
                      ),
                    ]
                  : item.branches[0]?.sourcePositions || [];
                const sy = rowY(entry.sourcePeriod);
                const ty = rowY(entry.targetPeriod);
                const targetPosition = isPingteMode
                  ? Math.max(0, (entry.targetPositions?.[0] || 7) - 1)
                  : 6;
                const tx = columnX(targetPosition);
                const joinX = tx - 56;
                const joinY = (sy + ty) / 2;
                const multi = entry.branches.length > 1;
                const labelHeight = genericMulti
                  ? historyLabelHeight
                  : multi ? 58 : 42;
                const labelTop = joinY - labelHeight / 2;
                const historyBranches = genericMulti
                  ? sortByAddition(entry.branches)
                  : entry.branches;
                const labelLines = historyBranches.map((branch) =>
                  (genericMulti ? compactMultiCalculation(branch.calculation) : conciseCalculation(branch.calculation))
                    .split(/[，,]/, 2)
                    .map((part) => part.trim())
                    .join(" "),
                );
                const statusText = entry.duplicateAnimal
                  ? "重"
                  : entry.hit
                    ? "准"
                    : "错";
                const statusColor = entry.duplicateAnimal
                  ? "#a56600"
                  : entry.hit
                    ? "#158241"
                    : "#c4262b";
                return (
                  <g key={`${entry.sourcePeriod}-${entry.targetPeriod}`}>
                    {isPingteMode ? (
                      entry.branches.flatMap((branch, branchIndex) => {
                        const branchSources =
                          item.branches[branchIndex]?.sourcePositions ||
                          positions;
                        const usesWholeDraw = /七码总分|总分/.test(
                          item.branches[branchIndex]?.name || branch.name,
                        );
                        const sourceXs = branchSources.map(columnX);
                        const branchTargets = branch.targetPositions || [];
                        const branchTarget = branchTargets[0];
                        const branchTx =
                          branchTarget != null
                            ? columnX(branchTarget - 1)
                            : tx;
                        const labelY = joinY + (branchIndex === 0 ? -13 : 13);
                        return (
                          <g key={`branch-${branchIndex}`}>
                            {usesWholeDraw ? (
                              <path
                                d={`M ${columnX(0)} ${sy - 44} L ${columnX(0)} ${sy - 58} L ${columnX(6)} ${sy - 58} L ${columnX(6)} ${sy - 44} M ${columnX(3)} ${sy - 58} C ${columnX(3)} ${labelY}, 470 ${labelY}, 540 ${labelY}`}
                              />
                            ) : (
                              sourceXs.map((sourceX, sourceIndex) => (
                                <path
                                  key={`${branchIndex}-${sourceIndex}`}
                                  d={`M ${sourceX} ${sy - 18} C ${sourceX} ${labelY}, 470 ${labelY}, 540 ${labelY}`}
                                />
                              ))
                            )}
                            {entry.hit && branchTarget != null && (
                              <path
                                d={`M 700 ${labelY} C 900 ${labelY}, ${branchTx} ${ty + 28}, ${branchTx} ${ty + 7}`}
                                markerEnd="url(#wuxing-arrow)"
                              />
                            )}
                          </g>
                        );
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
                    <g className="wuxing-native-label">
                      <rect
                        x={genericMulti ? 220 : 432}
                        y={labelTop}
                        width={genericMulti ? 730 : 425}
                        height={labelHeight}
                        rx={multi ? 11 : 18}
                        fill="#c92529"
                      />
                      {labelLines.map((line, lineIndex) => {
                        const availableLineWidth = genericMulti
                          ? Math.floor(630 / historyColumns)
                          : 340;
                        const minimumFontSize = genericMulti ? 15 : 16;
                        const fontSize = Math.max(
                          minimumFontSize,
                          Math.min(multi ? 22 : 21, Math.floor(availableLineWidth / Math.max(line.length, 1))),
                        );
                        const lineColumn = genericMulti ? lineIndex % historyColumns : 0;
                        const lineRow = genericMulti ? Math.floor(lineIndex / historyColumns) : lineIndex;
                        const lineY = genericMulti
                          ? labelTop + 26 + lineRow * 32
                          : multi
                            ? joinY + (lineIndex === 0 ? -13 : 13)
                            : joinY + 1;
                        return (
                          <text
                            key={lineIndex}
                            x={genericMulti
                              ? 255 + availableLineWidth / 2 + lineColumn * availableLineWidth
                              : 615}
                            y={lineY}
                            fill="#fff"
                            fontFamily="PingFang SC, Microsoft YaHei, sans-serif"
                            fontSize={fontSize}
                            fontWeight="900"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            {...(genericMulti && line.length * fontSize > availableLineWidth
                              ? { textLength: availableLineWidth, lengthAdjust: "spacingAndGlyphs" as const }
                              : {})}
                          >
                            {line}
                          </text>
                        );
                      })}
                      <rect
                        x={genericMulti ? 900 : 815}
                        y={joinY - 14}
                        width="29"
                        height="28"
                        rx="7"
                        fill="#fff"
                      />
                      <text
                        x={genericMulti ? 914.5 : 829.5}
                        y={joinY + 1}
                        fill={statusColor}
                        fontFamily="PingFang SC, Microsoft YaHei, sans-serif"
                        fontSize="15"
                        fontWeight="900"
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        {statusText}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>
        )}
        {!item.verification && (
          <div
            className={`wuxing-formula-note${item.branches.length > 1 ? " multi" : ""}`}
            style={genericMulti?{top:70}:undefined}
          >
            <b>公式算法</b>
            <div className="formula-pairs">
              {displayBranches.map((branch, index) => {
                const result = branch.next || item.next[index];
                return (
                  <div className="formula-pair" key={`${branch.name}-${index}`}>
                    <span>{genericMulti ? compactMultiCalculation(branch.calculation || branch.name) : conciseCalculation(branch.calculation || branch.name)}</span>
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
