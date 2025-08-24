import { assignLanes } from '../laneAssignment';
import type { ScoreData } from '../types';
import './Timeline.css';

const BEAT_WIDTH = 40;
const LANE_HEIGHT = 40;

export function Timeline({ data }: { data: ScoreData }) {
  const lanes = assignLanes(data.notes, data.deps);
  const totalBeats = Math.max(
    ...Object.values(data.notes).map((n) => n.startBeat + n.durationBeats),
  );
  const measures = Math.ceil(totalBeats / data.tempo);
  const width = totalBeats * BEAT_WIDTH;
  const height = (Math.max(...Object.values(lanes)) + 1) * LANE_HEIGHT;

  return (
    <div className="timeline" style={{ width, height }}>
      {/* measure lines */}
      {Array.from({ length: measures + 1 }).map((_, i) => (
        <div
          key={`m${i}`}
          className="measure-line"
          style={{ left: i * data.tempo * BEAT_WIDTH }}
        />
      ))}

      {/* lane lines */}
      {Array.from({ length: height / LANE_HEIGHT + 1 }).map((_, i) => (
        <div
          key={`l${i}`}
          className="lane-line"
          style={{ top: i * LANE_HEIGHT }}
        />
      ))}

      {/* notes */}
      {Object.values(data.notes).map((note) => {
        const lane = lanes[note.id] ?? 0;
        return (
          <div
            key={note.id}
            className="note"
            style={{
              left: note.startBeat * BEAT_WIDTH,
              top: lane * LANE_HEIGHT + 5,
              width: note.durationBeats * BEAT_WIDTH,
              height: LANE_HEIGHT - 10,
            }}
          >
            {note.title}
          </div>
        );
      })}

      {/* dependency lines */}
      <svg
        className="deps"
        width={width}
        height={height}
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      >
        {data.deps.map((dep, i) => {
          const src = data.notes[dep.srcId];
          const dst = data.notes[dep.dstId];
          const srcLane = lanes[dep.srcId];
          const dstLane = lanes[dep.dstId];
          const x1 = (src.startBeat + src.durationBeats) * BEAT_WIDTH;
          const y1 = srcLane * LANE_HEIGHT + LANE_HEIGHT / 2;
          const x2 = dst.startBeat * BEAT_WIDTH;
          const y2 = dstLane * LANE_HEIGHT + LANE_HEIGHT / 2;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="black"
              strokeWidth={1}
            />
          );
        })}
      </svg>
    </div>
  );
}

export default Timeline;
