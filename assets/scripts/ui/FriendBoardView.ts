import {
  _decorator,
  Component,
  ImageAsset,
  Node,
  Sprite,
  SpriteFrame,
  Texture2D,
  UITransform,
} from "cc";
import { WechatAdapter } from "../platform/WechatAdapter";

const { ccclass } = _decorator;

@ccclass("FriendBoardView")
export class FriendBoardView extends Component {
  private image?: ImageAsset;
  private texture?: Texture2D;
  private wait = 0;

  static mount(
    parent: Node,
    x: number,
    y: number,
    width: number,
    height: number,
    selfScore: number,
  ): boolean {
    if (!WechatAdapter.canShowFriendBoard()) return false;
    const node = new Node("FriendBoard");
    node.layer = parent.layer;
    node.parent = parent;
    node.setPosition(x, y);
    node.addComponent(UITransform).setContentSize(width, height);
    node.addComponent(FriendBoardView);
    WechatAdapter.requestFriendRank(selfScore);
    return true;
  }

  protected onLoad(): void {
    const canvas = WechatAdapter.friendCanvas();
    const transform = this.getComponent(UITransform);
    if (!canvas || !transform) {
      this.enabled = false;
      return;
    }
    WechatAdapter.prepareFriendCanvas(transform.width, transform.height);
    this.image = new ImageAsset();
    this.image.reset(canvas as never);
    this.texture = new Texture2D();
    this.texture.image = this.image;
    this.texture.create(canvas.width, canvas.height);
    const frame = new SpriteFrame();
    frame.texture = this.texture;
    const sprite = this.addComponent(Sprite);
    if (!sprite) return;
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    sprite.spriteFrame = frame;
  }

  protected update(dt: number): void {
    this.wait += dt;
    if (this.wait < 0.12) return;
    this.wait = 0;
    const canvas = WechatAdapter.friendCanvas();
    if (!canvas || !this.image || !this.texture) return;
    if (canvas.width <= 0 || canvas.height <= 0) return;
    this.image.reset(canvas as never);
    this.texture.uploadData(canvas as never);
  }

  protected onDestroy(): void {
    this.texture?.destroy();
    this.image?.destroy();
    this.texture = undefined;
    this.image = undefined;
  }
}
