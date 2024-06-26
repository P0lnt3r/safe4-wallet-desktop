import { useEffect, useState } from "react"
import { useDispatch } from "react-redux";
import useDebounce from "../../hooks/useDebounce";
import { applicationBlockchainUpdateBlockNumber } from "./action";
import { useWeb3React } from "@web3-react/core";


export default () => {
    const { provider } = useWeb3React();
    const dispatch = useDispatch();

    const [state, setState] = useState<{ blockNumber: number | null }>({
        blockNumber: null
    })
    const debouncedState = useDebounce(state, 100);
    const blockNumberCallback = (blockNumber: number) => {
        setState({ blockNumber });
    }
    useEffect(() => {
        provider?.getBlockNumber()
            .then(blockNumberCallback)
            .catch(error => {

            });
        provider?.on("block", blockNumberCallback)
        return () => {
            provider?.removeListener('block', blockNumberCallback)
        }
    }, [provider]);

    useEffect(() => {
        if (!debouncedState.blockNumber) return
        provider?.getBlock(debouncedState.blockNumber)
            .then(response => {
                const { timestamp } = response;
                dispatch(applicationBlockchainUpdateBlockNumber({
                    blockNumber: debouncedState.blockNumber ?? 0,
                    timestamp
                }));
            }).catch(err => {

            })
    }, [dispatch, state, debouncedState.blockNumber])


    return <></>

}
