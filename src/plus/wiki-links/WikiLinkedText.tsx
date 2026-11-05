import { useActiveWikiNameIndex, wikiLinkArticleAttribute } from "./wiki-link-store";

/** Display text whose known names become wiki links while the modifier is held. */
export function WikiLinkedText({ english, display }: { english: string; display: string }): JSX.Element {
  const index = useActiveWikiNameIndex();
  if (!index) return <>{display}</>;
  return (
    <>
      {index.segments(english, display).map((segment, position) => segment.article ? (
        <span className="nh3d-wiki-link" key={position} {...{ [wikiLinkArticleAttribute]: segment.article }}>
          {segment.text}
        </span>
      ) : segment.text)}
    </>
  );
}
