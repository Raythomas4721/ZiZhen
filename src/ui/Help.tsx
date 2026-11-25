// 「怎麼玩」：用小盤面圖解規則，隨時可以回來看。

interface MiniProps {
  /** 每一列一個字串，「・」是空地，「＝」是墨妖走的路。 */
  rows: string[];
  /** 要框起來的格子（同一組會畫在一起）。 */
  mark?: [number, number][];
  ok: boolean;
  caption: string;
}

function Mini({ rows, mark = [], ok, caption }: MiniProps) {
  const marked = new Set(mark.map(([x, y]) => `${x},${y}`));
  return (
    <figure className={`mini ${ok ? 'ok' : 'bad'}`}>
      <div className="mini-grid" style={{ gridTemplateColumns: `repeat(${[...rows[0]].length}, 1.9rem)` }}>
        {rows.flatMap((r, y) =>
          [...r].map((c, x) => (
            <span key={`${x},${y}`} className={`mini-cell ${c === '＝' ? 'path' : c === '・' ? 'empty' : 'char'} ${marked.has(`${x},${y}`) ? 'mark' : ''}`}>
              {c === '＝' || c === '・' ? '' : c}
            </span>
          )),
        )}
      </div>
      <figcaption>
        <b>{ok ? '✓' : '✗'}</b> {caption}
      </figcaption>
    </figure>
  );
}

interface Props {
  onBack: () => void;
  onReplayTutorial: () => void;
}

export function Help({ onBack, onReplayTutorial }: Props) {
  return (
    <div className="shelf help">
      <button className="ghost" onClick={onBack}>
        ← 書架
      </button>
      <h2>怎麼玩</h2>

      <section>
        <h3>1. 抽字、放字</h3>
        <p>按「抽字」花文錢拿一張字卡（同一波裡越抽越貴），拖到路旁的空格就變成字塔，墨妖走進射程就會被打。打倒墨妖、守住一波都能拿文錢。</p>
        <p className="muted">字的顏色代表類型：紅＝範圍、藍＝控場（減速）、綠＝屏障、褐＝單體重擊、橘＝輔助（幫旁邊的字加速）、金＝光環（照出隱墨、加射程）。</p>
        <p className="muted">「山」「木」「石」這類屏障字可以直接放在路上，墨妖要先把它啃穿才過得去。</p>
      </section>

      <section>
        <h3>2. 合成升級</h3>
        <p>兩個一樣的字、一樣的等級，疊在一起就升一級（最高 5 級）。手上的卡互疊、卡疊到盤面的字、盤面的字拖到另一個盤面的字，都可以。</p>
      </section>

      <section>
        <h3>3. 連成詞</h3>
        <p>兩個字照<b>閱讀順序</b>相鄰就連成詞，兩個字都會變強。橫排由左讀到右，直排由上讀到下。</p>
        <div className="mini-row">
          <Mini rows={['火山']} mark={[[0, 0], [1, 0]]} ok caption="橫排：火山" />
          <Mini rows={['山', '水']} mark={[[0, 0], [0, 1]]} ok caption="直排：山水" />
          <Mini rows={['山火']} ok={false} caption="反過來不算" />
          <Mini rows={['火・山']} ok={false} caption="中間隔開不算" />
        </div>
        <p>一個字可以同時在好幾個詞裡，每個詞的加成都拿得到：</p>
        <div className="mini-row">
          <Mini rows={['火山', '・水']} mark={[[0, 0], [1, 0], [1, 1]]} ok caption="山同時在「火山」「山水」" />
        </div>
        <p className="muted">點一下盤面上的字，可以看它在哪些詞裡；發現過的詞都會記進「字典本」。被「塗改」塗黑、被「錯字」對調時，詞會暫時斷掉，過幾秒會自己接回來。</p>
      </section>

      <section>
        <h3>4. 成語（第四章起）</h3>
        <p>四個字排成一直線（橫排或直排，一樣照閱讀順序）就是成語，會開始集氣；集滿後按下方的成語按鈕，放全場大招。</p>
        <div className="mini-row">
          <Mini rows={['刀山火海']} mark={[[0, 0], [1, 0], [2, 0], [3, 0]]} ok caption="刀山火海：全場重傷再燒三秒" />
        </div>
      </section>

      <section>
        <h3>5. 對仗（第五章起）</h3>
        <p>兩個<b>同類</b>的詞（例如都是寫天上的）上下疊在一起，或左右並排，就是對仗，四個字都再變強。沒排出對仗也能過關。</p>
        <div className="mini-row">
          <Mini rows={['明月', '清風']} mark={[[0, 0], [1, 0], [0, 1], [1, 1]]} ok caption="明月（天文）對清風（天文）" />
          <Mini rows={['明月', '雪山']} ok={false} caption="天文對地理，不算" />
        </div>
      </section>

      <section>
        <h3>6. 部件與工具</h3>
        <p>虛線框的是部件，兩張疊在一起合成一個字，例如「氵」＋「青」＝「清」。</p>
        <p>工具卡要拖到盤面上的字：鏟子把字收回手上（可以換位置）、毛筆換成同部首的另一個字、紙鎮鎖住字不被塗改和錯字影響。</p>
      </section>

      <section>
        <h3>7. 不會輸</h3>
        <p>書頁被啃光只是這一波沒守住、少一顆星，下一波照樣開始。連續兩波沒守住，墨妖會悄悄變弱一點。</p>
      </section>

      <div className="actions" style={{ display: 'flex', justifyContent: 'center', margin: '1.2rem 0' }}>
        <button onClick={onReplayTutorial}>重看第一章的教學</button>
      </div>
    </div>
  );
}
