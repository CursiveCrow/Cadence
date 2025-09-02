import { Application, Container, Rectangle } from 'pixi.js'
import type { TimelineLayers } from '../types/renderer'

export function createTimelineLayers(app: Application): TimelineLayers {
    const viewport = new Container()
    app.stage.addChild(viewport)

    const background = new Container()
    const dependencies = new Container()
    const tasksLayer = new Container()
    const selectionLayer = new Container()
    const dragLayer = new Container()

    viewport.addChild(background)
    viewport.addChild(dependencies)
    viewport.addChild(tasksLayer)
    viewport.addChild(selectionLayer)
    viewport.addChild(dragLayer)

    app.stage.eventMode = 'static'
    if (!(app.stage as any).hitArea) {
        (app.stage as any).hitArea = new Rectangle(0, 0, app.screen.width, app.screen.height)
    }
    viewport.eventMode = 'passive'
    background.eventMode = 'none'
    dependencies.eventMode = 'none'
    selectionLayer.eventMode = 'none'
    dragLayer.eventMode = 'none'
    tasksLayer.eventMode = 'static'

    return { viewport, background, dependencies, tasks: tasksLayer, selection: selectionLayer, dragLayer }
}


