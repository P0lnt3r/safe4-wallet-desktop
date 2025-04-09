import { useState } from "react"
import AddLiquidity from "./AddLiquidity";
import PoolList from "./PoolList";
import RemoveLiquidity from "./RemoveLiquidity";


export enum AssetPoolModule {
  List = "List",
  Add = "Add",
  Remove = "Remove",
}

export default () => {
  const [assetPoolModule, setAssetPoolModule] = useState<AssetPoolModule>(AssetPoolModule.List);
  return <>
    {
      assetPoolModule == AssetPoolModule.Add && <AddLiquidity setAssetPoolModule={setAssetPoolModule} />
    }
    {
      assetPoolModule == AssetPoolModule.List && <PoolList setAssetPoolModule={setAssetPoolModule} />
    }
    {
      assetPoolModule == AssetPoolModule.Remove && <RemoveLiquidity setAssetPoolModule={setAssetPoolModule} />
    }
  </>
}
