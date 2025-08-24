import React, { useEffect, useRef, useCallback } from 'react';
import * as PIXI from 'pixi.js';
import { Quantizer, LaneAssigner, ChordGrouper } from '@cadence/domain';
import { useTimelineStore } from '../store/timelineStore';

interface TimelineCanvasProps {
  width: number;
  height: number;
}

export const TimelineCanvas: React.FC<TimelineCanvasProps> = ({ width, height }) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const containerRef = useRef<PIXI.Container | null>(null);
  
  const { score, notes, dependencies, zoom, scrollX, scrollY, selectedNoteIds, updateNote } = useTimelineStore();
  
  // Constants for rendering
  const STAFF_LINE_COUNT = 5;
  const STAFF_LINE_SPACING = 20;
  const MEASURE_WIDTH = 200;
  const BEAT_WIDTH = 50;
  const NOTE_HEIGHT = 30;
  const LANE_HEIGHT = 40;
  
  // Initialize PixiJS application
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Create PixiJS application
    const app = new PIXI.Application({
      width,
      height,
      backgroundColor: 0xf8f8f2,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    
    canvasRef.current.appendChild(app.view as HTMLCanvasElement);
    appRef.current = app;
    
    // Create main container
    const container = new PIXI.Container();
    app.stage.addChild(container);
    containerRef.current = container;
    
    return () => {
      app.destroy(true, { children: true, texture: true, baseTexture: true });
      appRef.current = null;
      containerRef.current = null;
    };
  }, [width, height]);
  
  // Render timeline
  useEffect(() => {
    if (!appRef.current || !containerRef.current || !score) return;
    
    const container = containerRef.current;
    container.removeChildren();
    
    // Apply zoom and scroll
    container.scale.set(zoom, zoom);
    container.position.set(-scrollX * zoom, -scrollY * zoom);
    
    // Create graphics object for drawing
    const graphics = new PIXI.Graphics();
    container.addChild(graphics);
    
    // Draw staff lines
    graphics.lineStyle(1, 0xcccccc, 0.5);
    for (let i = 0; i < STAFF_LINE_COUNT; i++) {
      const y = 100 + i * STAFF_LINE_SPACING;
      graphics.moveTo(0, y);
      graphics.lineTo(width * 2, y);
    }
    
    // Draw measure bars
    const quantizer = new Quantizer(score);
    const measures = quantizer.getMeasures();
    
    graphics.lineStyle(2, 0x999999, 0.8);
    measures.forEach((measure) => {
      const x = measure.startBeat * BEAT_WIDTH;
      graphics.moveTo(x, 50);
      graphics.lineTo(x, 250);
      
      // Add measure label
      const text = new PIXI.Text(measure.label, {
        fontFamily: 'Arial',
        fontSize: 12,
        fill: 0x666666,
      });
      text.x = x + 5;
      text.y = 35;
      container.addChild(text);
    });
    
    // Perform lane assignment
    const laneAssigner = new LaneAssigner(notes, dependencies);
    const laneAssignment = laneAssigner.assign();
    
    // Draw notes
    notes.forEach((note) => {
      const laneIndex = laneAssignment.assignments.get(note.id) || 0;
      const x = note.startBeat * BEAT_WIDTH;
      const y = 100 + laneIndex * LANE_HEIGHT;
      const width = note.durationBeats * BEAT_WIDTH - 5;
      
      // Draw note pill
      const isSelected = selectedNoteIds.has(note.id);
      const fillColor = isSelected ? 0xec4899 : 0xa855f7;
      
      graphics.beginFill(fillColor, 0.9);
      graphics.lineStyle(2, fillColor, 1);
      graphics.drawRoundedRect(x, y, width, NOTE_HEIGHT, NOTE_HEIGHT / 2);
      graphics.endFill();
      
      // Add note title
      const text = new PIXI.Text(note.title, {
        fontFamily: 'Arial',
        fontSize: 12,
        fill: 0xffffff,
        fontWeight: 'bold',
      });
      text.x = x + 10;
      text.y = y + (NOTE_HEIGHT - text.height) / 2;
      container.addChild(text);
      
      // Make note interactive
      const hitArea = new PIXI.Rectangle(x, y, width, NOTE_HEIGHT);
      graphics.interactive = true;
      graphics.hitArea = hitArea;
    });
    
    // Draw dependencies
    graphics.lineStyle(2, 0xec4899, 0.6);
    dependencies.forEach((dep) => {
      const srcNote = notes.find(n => n.id === dep.srcNoteId);
      const dstNote = notes.find(n => n.id === dep.dstNoteId);
      
      if (!srcNote || !dstNote) return;
      
      const srcLane = laneAssignment.assignments.get(srcNote.id) || 0;
      const dstLane = laneAssignment.assignments.get(dstNote.id) || 0;
      
      const srcX = (srcNote.startBeat + srcNote.durationBeats) * BEAT_WIDTH;
      const srcY = 100 + srcLane * LANE_HEIGHT + NOTE_HEIGHT / 2;
      const dstX = dstNote.startBeat * BEAT_WIDTH;
      const dstY = 100 + dstLane * LANE_HEIGHT + NOTE_HEIGHT / 2;
      
      // Draw orthogonal connector
      graphics.moveTo(srcX, srcY);
      
      if (srcLane === dstLane) {
        // Same lane - straight line
        graphics.lineTo(dstX, dstY);
      } else {
        // Different lanes - orthogonal path
        const midX = (srcX + dstX) / 2;
        graphics.lineTo(midX, srcY);
        graphics.lineTo(midX, dstY);
        graphics.lineTo(dstX, dstY);
      }
      
      // Draw arrowhead
      const angle = Math.atan2(dstY - srcY, dstX - srcX);
      const arrowSize = 8;
      graphics.beginFill(0xec4899, 0.6);
      graphics.moveTo(dstX, dstY);
      graphics.lineTo(
        dstX - arrowSize * Math.cos(angle - Math.PI / 6),
        dstY - arrowSize * Math.sin(angle - Math.PI / 6)
      );
      graphics.lineTo(
        dstX - arrowSize * Math.cos(angle + Math.PI / 6),
        dstY - arrowSize * Math.sin(angle + Math.PI / 6)
      );
      graphics.closePath();
      graphics.endFill();
    });
    
  }, [score, notes, dependencies, zoom, scrollX, scrollY, selectedNoteIds, width, height]);
  
  // Handle mouse interactions
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    useTimelineStore.getState().setZoom(zoom * delta);
  }, [zoom]);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);
  
  return (
    <div 
      ref={canvasRef} 
      className="timeline-canvas w-full h-full overflow-hidden"
      style={{ cursor: 'grab' }}
    />
  );
};
