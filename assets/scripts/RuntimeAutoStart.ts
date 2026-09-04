import { Director, director } from "cc";
import { RuntimeHome } from "./RuntimeHome";
import { RuntimePrototype } from "./RuntimePrototype";

declare const EDITOR: boolean;

function attachHarbor(): void {
  const canvas = director.getScene()?.getChildByName("Canvas");
  if (!canvas) return;
  const proto = canvas.getComponent(RuntimePrototype);
  if (proto && !RuntimePrototype.pending) {
    proto.destroy();
  }
  if (!canvas.getComponent(RuntimeHome)) {
    canvas.addComponent(RuntimeHome);
  }
}

if (typeof EDITOR === "undefined" || !EDITOR) {
  director.once(Director.EVENT_AFTER_SCENE_LAUNCH, attachHarbor);
  if (director.getScene()) attachHarbor();
}
