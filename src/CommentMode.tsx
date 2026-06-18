import { useEffect, useState } from "react";

function cmCssPath(el: Element): string {
  const stop = el.ownerDocument?.body ?? null;
  const parts: string[] = [];
  let node: Element | null = el;
  while (node && node !== stop && parts.length < 4) {
    if (node.id) {
      parts.unshift(`#${node.id}`);
      break;
    }
    let part = node.tagName.toLowerCase();
    const parent = node.parentElement;
    if (parent) {
      const idx = Array.from(parent.children).indexOf(node) + 1;
      part += `:nth-child(${idx})`;
    }
    parts.unshift(part);
    node = node.parentElement;
  }
  return parts.join(" > ");
}

function resolveElementId(el: Element | null): { el: Element; id: string } | null {
  const stop = el?.ownerDocument?.body ?? null;
  let node: Element | null = el;
  while (node && node !== stop) {
    const id = node.getAttribute("id") || node.getAttribute("data-eid");
    if (id) return { el: node, id };
    node = node.parentElement;
  }
  return el ? { el, id: cmCssPath(el) } : null;
}

// 로컬 개발 전용: 라이브 화면에서 요소를 클릭해 id별로 수정 코멘트를 모으는 오버레이.
export function CommentMode() {
  const [active, setActive] = useState(false);
  const [hover, setHover] = useState<{ top: number; left: number; width: number; height: number; label: string } | null>(null);
  const [items, setItems] = useState<Array<{ id: string; text: string; comment: string }>>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!active) {
      setHover(null);
      return;
    }

    const frameLabel = (frame: HTMLIFrameElement) =>
      (frame.getAttribute("src") || "iframe").split("/").pop()?.split("?")[0] || "iframe";

    const onMove = (frame: HTMLIFrameElement | null) => (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target || (target.closest && target.closest(".cm-ui"))) {
        setHover(null);
        return;
      }
      const resolved = resolveElementId(target);
      if (!resolved) {
        setHover(null);
        return;
      }
      const rect = resolved.el.getBoundingClientRect();
      let top = rect.top;
      let left = rect.left;
      if (frame) {
        const fr = frame.getBoundingClientRect();
        top += fr.top;
        left += fr.left;
      }
      const prefix = frame ? `${frameLabel(frame)} ▸ ` : "";
      setHover({ top, left, width: rect.width, height: rect.height, label: prefix + resolved.id });
    };

    const onClick = (frame: HTMLIFrameElement | null) => (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target || (target.closest && target.closest(".cm-ui"))) return;
      event.preventDefault();
      event.stopPropagation();
      const resolved = resolveElementId(target);
      if (!resolved) return;
      const text = (resolved.el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 60);
      const prefix = frame ? `${frameLabel(frame)} ▸ ` : "";
      setItems((current) => [...current, { id: prefix + resolved.id, text, comment: "" }]);
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActive(false);
    };

    // 메인 문서 + 접근 가능한(same-origin) iframe 문서에 모두 리스너를 붙인다.
    const targets: Array<{ doc: Document; frame: HTMLIFrameElement | null }> = [{ doc: document, frame: null }];
    document.querySelectorAll("iframe").forEach((frame) => {
      try {
        const innerDoc = frame.contentDocument;
        if (innerDoc && innerDoc.body) targets.push({ doc: innerDoc, frame });
      } catch {
        /* cross-origin iframe: 접근 불가 */
      }
    });

    const cleanups: Array<() => void> = [];
    targets.forEach(({ doc, frame }) => {
      const move = onMove(frame);
      const click = onClick(frame);
      doc.addEventListener("mousemove", move, true);
      doc.addEventListener("click", click, true);
      doc.addEventListener("keydown", onKey, true);
      cleanups.push(() => {
        doc.removeEventListener("mousemove", move, true);
        doc.removeEventListener("click", click, true);
        doc.removeEventListener("keydown", onKey, true);
      });
    });

    return () => cleanups.forEach((fn) => fn());
  }, [active]);

  const copyAll = async () => {
    const md = items
      .map((it) => `- #${it.id}${it.text ? ` ("${it.text}")` : ""}: ${it.comment || "(코멘트 없음)"}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <>
      {active && hover ? (
        <div className="cm-hl" style={{ top: hover.top, left: hover.left, width: hover.width, height: hover.height }}>
          <span className="cm-hl-label">{hover.label}</span>
        </div>
      ) : null}
      <div className="cm-ui">
        <button className={`cm-toggle ${active ? "on" : ""}`} type="button" onClick={() => setActive((v) => !v)}>
          {active ? "코멘트 모드 ●" : "코멘트 모드"}
        </button>
        {active ? (
          <div className="cm-panel">
            <div className="cm-panel-head">
              <strong>코멘트 {items.length}</strong>
              <button type="button" onClick={() => setItems([])}>
                비우기
              </button>
              <button type="button" onClick={copyAll}>
                {copied ? "복사됨!" : "전체 복사"}
              </button>
            </div>
            <div className="cm-list">
              {items.length === 0 ? <p className="cm-empty">요소를 클릭하면 여기에 추가됩니다.</p> : null}
              {items.map((it, index) => (
                <div className="cm-item" key={index}>
                  <code>{it.id}</code>
                  {it.text ? <span className="cm-item-text">&ldquo;{it.text}&rdquo;</span> : null}
                  <textarea
                    placeholder="이 요소를 어떻게 바꿀까요?"
                    value={it.comment}
                    onChange={(event) =>
                      setItems((current) =>
                        current.map((x, idx) => (idx === index ? { ...x, comment: event.target.value } : x))
                      )
                    }
                  />
                  <button
                    className="cm-del"
                    type="button"
                    onClick={() => setItems((current) => current.filter((_, idx) => idx !== index))}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
