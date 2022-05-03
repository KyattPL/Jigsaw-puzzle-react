import React, { FC, useCallback, useEffect, useRef, useState } from 'react'

const clamp = (value: number, min: number, max: number) => {
  if (value < min) { return min }
  if (value > max) { return max }
  return value
}

const solveTolerancePercentage = 0.028

interface Tile {
  tileOffsetX: number
  tileOffsetY: number,
  tileWidth: number,
  tileHeight: number,
  correctPosition: number,
  currentPosXPerc: number,
  currentPosYPerc: number,
  origPosX: number,
  origPosY: number,
  solved: boolean
}

export interface JigsawPuzzleProps {
  /** Source of the image. Can be any URL or relative path. */
  imageSrc: string,
  /** The amount of rows the puzzle will have. Defaults to 3. */
  rows?: number,
  /** The amount of columns the puzzle with have. Defaults to 4. */
  columns?: number,
  /* Called when the puzzle is solved. Defaults to an empty function. */
  onSolved?: () => void
}

export const JigsawPuzzle: FC<JigsawPuzzleProps> = ({
  imageSrc,
  rows = 3,
  columns = 4,
  onSolved = () => {}
}) => {
  const [tiles, setTiles] = useState<Tile[] | undefined>()
  const [imageSize, setImageSize] = useState<{ width: number, height: number }>()
  const [rootSize, setRootSize] = useState<{ width: number, height: number }>()
  const [calculatedHeight, setCalculatedHeight] = useState<number>()
  const [isTransition, setIsTransition] = useState<boolean>(false)
  const rootElement = useRef<HTMLElement>()
  const resizeObserver = useRef<ResizeObserver>()
  const draggingTile = useRef<{ tile: Tile, elem: HTMLElement, mouseOffsetX: number, mouseOffsetY: number } | undefined>()
  const onImageLoaded = useCallback((image: HTMLImageElement) => {
    setImageSize({ width: image.width, height: image.height })
    if (rootSize) { setCalculatedHeight(rootSize!.width / image.width * image.height) }
    setTiles(
      Array.from(Array(rows * columns).keys())
        .map(position => ({
          correctPosition: position,
          tileHeight: image.height / rows,
          tileWidth: image.width / columns,
          tileOffsetX: (position % columns) * (image.width / columns),
          tileOffsetY: Math.floor(position / columns) * (image.height / rows),
          currentPosXPerc: Math.random() * (1 - 1 / rows),
          currentPosYPerc: Math.random() * (1 - 1 / columns),
          origPosX: Math.floor(500 * Math.random()),
          origPosY: Math.floor(300 * Math.random() + 450),
          solved: false
        }))
    )
  }, [rows, columns])

  const startTransition = async () => {
    while (transitionBack()) {
        await new Promise(_ => setTimeout(_, 3));
    }
  }

  const transitionBack = () => {
    let draggedTile = draggingTile.current.tile;
    let valX = Number.parseInt(draggingTile.current.elem.style.getPropertyValue('left'));
    let valY = Number.parseInt(draggingTile.current.elem.style.getPropertyValue('top'));

    if (valX !== draggedTile.origPosX || valY !== draggedTile.origPosY) {

        if (valX < draggedTile.origPosX) {
            valX += 1;
        } else if (valX > draggedTile.origPosX) {
            valX -= 1;
        }

        if (valY < draggedTile.origPosY) {
            valY += 1;
        } else if (valY > draggedTile.origPosY)  {
            valY -= 1;
        }

        draggingTile.current.elem.style.setProperty('left', `${valX}px`);
        draggingTile.current.elem.style.setProperty('top', `${valY}px`);

        return true;
    } else {
        return false;
    }
  };

  const onRootElementResized = useCallback((args: ResizeObserverEntry[]) => {
    const contentRect = args.find(it => it.contentRect)?.contentRect
    if (contentRect) {
      setRootSize({
        width: contentRect.width,
        height: contentRect.height
      })
      if (imageSize) {
        setCalculatedHeight(contentRect.width / imageSize!.width * imageSize!.height)
      }
    }
  }, [setRootSize, imageSize])

  const onRootElementRendered = useCallback((element: HTMLElement | null) => {
    if (element) {
      rootElement.current = element
      const observer = new ResizeObserver(onRootElementResized)
      observer.observe(element)
      resizeObserver.current = observer
      setRootSize({
        width: element.offsetWidth,
        height: element.offsetHeight
      })
      if (imageSize) { setCalculatedHeight(element.offsetWidth / imageSize.width * imageSize.height) }
    }
  }, [setRootSize, imageSize, rootElement, resizeObserver])

  useEffect(() => {
    const image = new Image()
    image.onload = () => onImageLoaded(image)
    image.src = imageSrc
  }, [imageSrc, rows, columns])

  const onTileMouseDown = useCallback((tile: Tile, event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!tile.solved && !isTransition) {
      if (event.type === 'touchstart') {
        document.documentElement.style.setProperty('overflow', 'hidden')
      }

      const eventPos = {
        x: (event as React.MouseEvent).pageX ?? (event as React.TouchEvent).touches[0].pageX,
        y: (event as React.MouseEvent).pageY ?? (event as React.TouchEvent).touches[0].pageY
      }
      draggingTile.current = {
        tile,
        elem: event.target as HTMLDivElement,
        mouseOffsetX: eventPos.x - (event.target as HTMLDivElement).getBoundingClientRect().x,
        mouseOffsetY: eventPos.y - (event.target as HTMLDivElement).getBoundingClientRect().y
      };
      (event.target as HTMLDivElement).classList.add('jigsaw-puzzle__piece--dragging')
    }
  }, [draggingTile, isTransition, setIsTransition])

  const onRootMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    console.log(isTransition);
    if (draggingTile.current && !isTransition) {
      event.stopPropagation()
      event.preventDefault()
      const eventPos = {
        x: (event as React.MouseEvent).pageX ?? (event as React.TouchEvent).touches[0].pageX,
        y: (event as React.MouseEvent).pageY ?? (event as React.TouchEvent).touches[0].pageY
      }
      const draggedToRelativeToRoot = {
        x: clamp(
          eventPos.x - rootElement.current!.getBoundingClientRect().left - draggingTile.current.mouseOffsetX,
          0,
          1920
        ),
        y: clamp(
          eventPos.y - rootElement.current!.getBoundingClientRect().top - draggingTile.current.mouseOffsetY,
          0,
          1080
        )
      }
      draggingTile.current.elem.style.setProperty('left', `${draggedToRelativeToRoot.x}px`)
      draggingTile.current.elem.style.setProperty('top', `${draggedToRelativeToRoot.y}px`)
    }
  }, [draggingTile, rootSize, isTransition, setIsTransition]);

  const onRootMouseUp = useCallback(async (event: React.TouchEvent | React.MouseEvent) => {
    if (draggingTile.current && !isTransition) {
      if (event.type === 'touchend') {
        document.documentElement.style.removeProperty('overflow')
      }
      draggingTile.current?.elem.classList.remove('jigsaw-puzzle__piece--dragging')
      const draggedToPercentage = {
        x: clamp(draggingTile.current!.elem.offsetLeft / rootSize!.width, 0, 1),
        y: clamp(draggingTile.current!.elem.offsetTop / rootSize!.height, 0, 1)
      }
      const draggedTile = draggingTile.current.tile
      const targetPositionPercentage = {
        x: draggedTile.correctPosition % columns / columns,
        y: Math.floor(draggedTile.correctPosition / columns) / rows
      }
      const isSolved = Math.abs(targetPositionPercentage.x - draggedToPercentage.x) <= solveTolerancePercentage &&
        Math.abs(targetPositionPercentage.y - draggedToPercentage.y) <= solveTolerancePercentage

      setTiles(prevState => {
        const newState = [
          ...prevState!.filter(it => it.correctPosition !== draggedTile.correctPosition),
          {
            ...draggedTile,
            currentPosXPerc: !isSolved ? draggedTile.origPosX : targetPositionPercentage.x * rootSize.width,
            currentPosYPerc: !isSolved ? draggedTile.origPosY : targetPositionPercentage.y * rootSize.height,
            solved: isSolved
          }
        ]
        if (newState.every(tile => tile.solved)) {
          onSolved()
        }
        return newState
      })

      if (!isSolved) {
        var audio = new Audio("./wrong.mp3");
        audio.play();
        await setIsTransition(true);
        await startTransition();
      } else {
        var audio = new Audio("./correct.wav");
        audio.play();
        draggingTile.current.elem.style.setProperty('left', `${targetPositionPercentage.x * rootSize.width}px`);
        draggingTile.current.elem.style.setProperty('top', `${targetPositionPercentage.y * rootSize.height}px`);
      }

      draggingTile.current = undefined;
      await setIsTransition(false);
    }
  }, [draggingTile, setTiles, rootSize, onSolved, isTransition, setIsTransition])

  return <div ref={onRootElementRendered}
              onTouchMove={onRootMouseMove}
              onMouseMove={onRootMouseMove}
              onTouchEnd={onRootMouseUp}
              onMouseUp={onRootMouseUp}
              onTouchCancel={onRootMouseUp}
              onMouseLeave={onRootMouseUp}
              className="jigsaw-puzzle my-puzzle"
              style={{ height: !calculatedHeight ? undefined : `${calculatedHeight}px` }}
              onDragEnter={event => {
                event.stopPropagation()
                event.preventDefault()
              }}
              onDragOver={event => {
                event.stopPropagation()
                event.preventDefault()
              }}
  >
    {tiles && rootSize && imageSize && tiles.map(tile =>
      <div
        draggable={false}
        onMouseDown={event => onTileMouseDown(tile, event)}
        onTouchStart={event => onTileMouseDown(tile, event)}
        key={tile.correctPosition}
        className={`jigsaw-puzzle__piece ${tile.solved ? ' jigsaw-puzzle__piece--solved' : ''} `}
        style={{
          position: 'absolute',
          height: `${1 / rows * 100}%`,
          width: `${1 / columns * 100}%`,
          backgroundImage: `url(${imageSrc})`,
          backgroundSize: `${rootSize.width}px ${rootSize.height}px`,
          backgroundPositionX: `${tile.correctPosition % columns / (columns - 1) * 100}%`,
          backgroundPositionY: `${Math.floor(tile.correctPosition / columns) / (rows - 1) * 100}%`,
          left: `${tile.origPosX}px`,
          top: `${tile.origPosY}px`
        }}/>)}
  </div>
}