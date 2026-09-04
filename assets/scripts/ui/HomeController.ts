import { _decorator, Component, Label } from "cc";
import { playerSave } from "../save/SaveService";
import { HarborActions } from "./HarborActions";

const { ccclass, property } = _decorator;

@ccclass("HomeController")
export class HomeController extends Component {
  @property({ type: Label })
  public coinLabel: Label | null = null;

  protected start(): void {
    this.render();
  }

  async upgrade(toolId: string): Promise<boolean> {
    const error = await HarborActions.upgrade(toolId);
    this.render();
    return !error;
  }

  async buyTool(toolId: string): Promise<boolean> {
    const error = await HarborActions.buyTool(toolId);
    this.render();
    return !error;
  }

  async unlockIsland(islandId: string): Promise<boolean> {
    const error = await HarborActions.unlockIsland(islandId);
    this.render();
    return !error;
  }

  private render(): void {
    if (this.coinLabel) this.coinLabel.string = `${playerSave.get().coins}`;
  }
}
