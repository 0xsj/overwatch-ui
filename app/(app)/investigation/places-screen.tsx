"use client";

import Link from "next/link";
import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Badge, Panel } from "@/components/display";
import { Text } from "@/components/typography";
import { keys } from "@/lib/query";
import type { PlaceGeometry, ResearchRecord } from "@/lib/services/research-records";
import { placePrecisionLabel, projectPlaceGeometry } from "@/lib/services/research-records/map";
import { PageHead } from "../_components/page-head";
import { Query, useContext } from "../_hooks";
import { researchRecordsQuery } from "../_queries";
import { dateLabel, investigationPath, MoreButton, recordHref } from "./_shared";
import s from "./investigation.module.css";

const MAP_WIDTH = 1000;
const MAP_HEIGHT = 520;

const precisionTone: Record<PlaceGeometry["precision"], "accent" | "warn" | "neutral"> = {
  exact: "accent",
  approximate: "warn",
  region: "neutral",
};

function geometryRecords(records: ResearchRecord[]): ResearchRecord[] {
  return records.filter((record) => record.kind === "place" && record.place_geometry);
}

export function PlacesScreen({ workspace }: { workspace: string }) {
  const { shell } = useContext();
  const [activeId, setActiveId] = useState<string | null>(null);
  const records = useInfiniteQuery({
    queryKey: keys.records.list(workspace, "", "place"),
    queryFn: ({ pageParam }) => researchRecordsQuery(workspace, pageParam, "", "place"),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  });
  const rows = records.data?.pages.flatMap((page) => page.items) ?? [];
  const mapped = geometryRecords(rows);
  const active = mapped.find((record) => record.record_id === activeId) ?? mapped[0];
  const withoutGeometry = rows.filter((record) => !record.place_geometry).length;

  return <>
    <PageHead title="Place geometry" actions={<div className={s.row}><Link href={investigationPath(workspace, "records")} className={s.back}>Open records</Link></div>}>
      Plot authored place coordinates together while keeping precision and source support attached to every point. This is a provenance map, not a geocoder or an inferred world model.
    </PageHead>
    <Panel title="Map coverage" note="Only place records with authored geometry appear on the canvas.">
      <Query of={records} label="place records">{() => <div className={s.stack}>
        <div className={s.row}>
          <Badge tone="neutral">{rows.length} loaded place record{rows.length === 1 ? "" : "s"}</Badge>
          <Badge tone="accent">{mapped.length} mapped</Badge>
          {withoutGeometry ? <Badge tone="warn">{withoutGeometry} without geometry</Badge> : null}
        </div>
        <MoreButton available={records.hasNextPage} pending={records.isFetchingNextPage} load={() => void records.fetchNextPage()} />
      </div>}</Query>
    </Panel>
    <div className={s.placeMapColumns}>
      <Panel title="Cited place map" note="Longitude runs left to right; latitude runs top to bottom. The grid is intentionally geography-neutral.">
        <Query of={records} label="place map">{() => mapped.length ? <div className={s.placeMapWrap}>
          <svg className={s.placeMap} viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} role="img" aria-label="Authored place coordinates plotted on a latitude and longitude grid">
            <rect className={s.placeMapSurface} x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT} rx="12" />
            {[-180, -90, 0, 90, 180].map((longitude) => {
              const x = ((longitude + 180) / 360) * MAP_WIDTH;
              return <g key={`longitude-${longitude}`}><line className={s.placeMapGrid} x1={x} y1="0" x2={x} y2={MAP_HEIGHT} /><text className={s.placeMapLabel} x={Math.min(Math.max(x + 8, 12), MAP_WIDTH - 42)} y="24">{longitude}°</text></g>;
            })}
            {[-90, -45, 0, 45, 90].map((latitude) => {
              const y = ((90 - latitude) / 180) * MAP_HEIGHT;
              return <g key={`latitude-${latitude}`}><line className={s.placeMapGrid} x1="0" y1={y} x2={MAP_WIDTH} y2={y} /><text className={s.placeMapLabel} x="12" y={Math.max(y - 8, 16)}>{latitude}°</text></g>;
            })}
            {mapped.map((record) => <PlaceMarker key={record.record_id} record={record} selected={record.record_id === active?.record_id} select={() => setActiveId(record.record_id)} />)}
            <text className={s.placeMapCaption} x={MAP_WIDTH - 16} y={MAP_HEIGHT - 16} textAnchor="end">authored coordinates only</text>
          </svg>
          <div className={s.placeMapLegend} aria-label="Map precision legend">
            <LegendItem className={s.placeMapDotExact} label={placePrecisionLabel("exact")} />
            <LegendItem className={s.placeMapDotApproximate} label={placePrecisionLabel("approximate")} />
            <LegendItem className={s.placeMapDotRegion} label={placePrecisionLabel("region")} />
          </div>
        </div> : <div className={s.empty}><Text size="sm">No place geometry is available yet.</Text><Text size="sm" tone="tertiary">Create a place record with a cited coordinate to make it appear here. Place records without geometry remain available in the records view.</Text><Link href={investigationPath(workspace, "records")} className={s.inlineLink}>Open research records</Link></div>}</Query>
      </Panel>
      <Panel title={active ? active.name : "Map detail"} note={active ? "The selected point remains linked to its authored record and citations." : undefined}>
        {active ? <PlaceDetail workspace={workspace} record={active} shell={shell} /> : <Text size="sm" tone="tertiary">Select a point to inspect its precision, citations, and record.</Text>}
      </Panel>
    </div>
  </>;
}

function LegendItem({ className, label }: { className: string; label: string }) {
  return <span className={s.placeMapLegendItem}><span className={`${s.placeMapLegendDot} ${className}`} aria-hidden="true" />{label}</span>;
}

function PlaceMarker({ record, selected, select }: { record: ResearchRecord; selected: boolean; select: () => void }) {
  const geometry = record.place_geometry!;
  const point = projectPlaceGeometry(geometry, MAP_WIDTH, MAP_HEIGHT);
  const label = `${record.name}, ${placePrecisionLabel(geometry.precision)}, ${geometry.observation_ids.length} citation${geometry.observation_ids.length === 1 ? "" : "s"}`;
  const dotClass = geometry.precision === "exact" ? s.placeMapDotExact : geometry.precision === "approximate" ? s.placeMapDotApproximate : s.placeMapDotRegion;
  return <g className={`${s.placeMapMarker} ${selected ? s.placeMapMarkerSelected : ""}`} role="button" tabIndex={0} aria-label={label} onClick={select} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(); } }}>
    {geometry.precision === "region" ? <circle className={`${s.placeMapHalo} ${dotClass}`} cx={point.x} cy={point.y} r="16" /> : null}
    <circle className={`${s.placeMapPoint} ${dotClass}`} cx={point.x} cy={point.y} r={selected ? 9 : 7} />
    <text className={s.placeMapName} x={Math.min(point.x + 12, MAP_WIDTH - 150)} y={point.y - 12}>{record.name}</text>
  </g>;
}

function PlaceDetail({ workspace, record, shell }: { workspace: string; record: ResearchRecord; shell?: ReturnType<typeof useContext>["shell"] }) {
  const geometry = record.place_geometry!;
  const author = shell?.me.account_id === record.author ? "You" : shell?.members.find((member) => member.account_id === record.author)?.name || record.author;
  return <div className={s.stack}>
    <div className={s.row}><Badge tone={precisionTone[geometry.precision]}>{placePrecisionLabel(geometry.precision)}</Badge><Badge tone={geometry.observation_ids.length ? "accent" : "warn"}>{geometry.observation_ids.length} citation{geometry.observation_ids.length === 1 ? "" : "s"}</Badge></div>
    <dl className={s.metadata}>
      <dt>Latitude</dt><dd>{geometry.latitude.toFixed(6)}°</dd>
      <dt>Longitude</dt><dd>{geometry.longitude.toFixed(6)}°</dd>
      <dt>Authored by</dt><dd>{author}</dd>
      <dt>Updated</dt><dd>{dateLabel(record.updated_at)}</dd>
    </dl>
    {record.description ? <Text size="sm" className={s.body}>{record.description}</Text> : null}
    <div className={s.stack}>
      <Text size="xs" tone="tertiary">Supporting observation IDs</Text>
      <Text size="sm" className={s.body}>{geometry.observation_ids.join(" · ")}</Text>
    </div>
    <Link href={recordHref(workspace, record.record_id)} className={s.inlineLink}>Open record and inspect citations</Link>
  </div>;
}
