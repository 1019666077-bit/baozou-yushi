import {
  EventKeyboard,
  EventMouse,
  Game,
  Input,
  KeyCode,
  game,
  input,
} from "cc";
import { desktopMoveAxis } from "../domain/DesktopInputRules";

export interface DesktopBattleInputHandlers {
  aim(screenX: number, screenY: number): void;
  aimStart(screenX: number, screenY: number): void;
  aimEnd(screenX: number, screenY: number): void;
  cast(): void;
  pickUp(): void;
  move(x: -1 | 0 | 1, y: -1 | 0 | 1): void;
  pauseForBlur(): void;
}

export class DesktopBattleInput {
  private readonly pressed = new Set<string>();
  private bound = false;

  constructor(private readonly handlers: DesktopBattleInputHandlers) {}

  bind(): void {
    if (this.bound) return;
    this.bound = true;
    input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
    input.on(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
    input.on(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
    input.on(Input.EventType.MOUSE_UP, this.onMouseUp, this);
    game.on(Game.EVENT_HIDE, this.onBlur, this);
  }

  unbind(): void {
    if (!this.bound) return;
    this.bound = false;
    input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
    input.off(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
    input.off(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
    input.off(Input.EventType.MOUSE_UP, this.onMouseUp, this);
    game.off(Game.EVENT_HIDE, this.onBlur, this);
    this.pressed.clear();
    this.handlers.move(0, 0);
  }

  private onKeyDown(event: EventKeyboard): void {
    const code = keyName(event.keyCode);
    if (code) {
      this.pressed.add(code);
      this.emitMove();
    }
    if (event.keyCode === KeyCode.SPACE) this.handlers.cast();
    if (event.keyCode === KeyCode.KEY_E) this.handlers.pickUp();
  }

  private onKeyUp(event: EventKeyboard): void {
    const code = keyName(event.keyCode);
    if (!code) return;
    this.pressed.delete(code);
    this.emitMove();
  }

  private onMouseMove(event: EventMouse): void {
    const point = event.getUILocation();
    this.handlers.aim(point.x, point.y);
  }

  private onMouseDown(event: EventMouse): void {
    if (event.getButton() !== EventMouse.BUTTON_LEFT) return;
    const point = event.getUILocation();
    this.handlers.aimStart(point.x, point.y);
  }

  private onMouseUp(event: EventMouse): void {
    if (event.getButton() !== EventMouse.BUTTON_LEFT) return;
    const point = event.getUILocation();
    this.handlers.aimEnd(point.x, point.y);
  }

  private onBlur(): void {
    this.pressed.clear();
    this.handlers.move(0, 0);
    this.handlers.pauseForBlur();
  }

  private emitMove(): void {
    const axis = desktopMoveAxis(this.pressed);
    this.handlers.move(axis.x, axis.y);
  }
}

function keyName(key: KeyCode): string | undefined {
  switch (key) {
    case KeyCode.KEY_W:
      return "KeyW";
    case KeyCode.KEY_A:
      return "KeyA";
    case KeyCode.KEY_S:
      return "KeyS";
    case KeyCode.KEY_D:
      return "KeyD";
    case KeyCode.ARROW_UP:
      return "ArrowUp";
    case KeyCode.ARROW_LEFT:
      return "ArrowLeft";
    case KeyCode.ARROW_DOWN:
      return "ArrowDown";
    case KeyCode.ARROW_RIGHT:
      return "ArrowRight";
    default:
      return undefined;
  }
}
