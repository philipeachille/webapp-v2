import { useEffect, useState } from 'react';
import { SUPPORTED_WALLETS, WalletInfo } from 'services/web3/wallet/utils';
import { UnsupportedChainIdError, useWeb3React } from '@web3-react/core';
import { WalletConnectConnector } from '@web3-react/walletconnect-connector';
import { Modal } from 'components/modal/Modal';
import { classNameGenerator, shortenString } from 'utils/pureFunctions';
import { ReactComponent as IconWallet } from 'assets/icons/wallet.svg';
import { FormattedMessage } from 'react-intl';
import { useAppSelector } from 'redux/index';
import { useDispatch } from 'react-redux';
import { openWalletModal } from 'redux/user/user';
import { Image } from 'components/image/Image';
import { sendWalletEvent, WalletEvents } from 'services/api/googleTagManager';
import { setAutoLoginLS } from 'utils/localStorage';
import useAsyncEffect from 'use-async-effect';
import { setSigner } from 'services/web3';
import { Web3Provider } from '@ethersproject/providers';

export const WalletModal = ({ isMobile }: { isMobile: boolean }) => {
  const { activate, deactivate, account, connector, active } = useWeb3React();
  const [pending, setPending] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);
  const [selectedWallet, setSelectedWallet] = useState<WalletInfo | null>(null);
  const walletModal = useAppSelector<boolean>(
    (state) => state.user.walletModal
  );
  const dispatch = useDispatch();

  const setIsOpen = (value: boolean) => {
    dispatch(openWalletModal(value));
  };

  const tryConnecting = async (wallet: WalletInfo) => {
    sendWalletEvent(WalletEvents.click, {
      wallet_name: wallet.name,
    });
    setPending(true);
    setSelectedWallet(wallet);
    const { connector } = wallet;

    if (
      connector instanceof WalletConnectConnector &&
      connector.walletConnectProvider?.wc?.uri
    )
      connector.walletConnectProvider = undefined;

    connector &&
      activate(connector, undefined, true)
        .then(async () => {
          setIsOpen(false);
          setAutoLoginLS(true);
          setSigner(
            new Web3Provider(await connector.getProvider()).getSigner()
          );
          const account = await connector.getAccount();
          sendWalletEvent(
            WalletEvents.connect,
            undefined,
            account ? account : '',
            wallet.name ?? ''
          );
        })
        .catch((error) => {
          console.error(error);
          if (error instanceof UnsupportedChainIdError) {
            activate(connector);
          } else setError(true);
        });
  };

  const connectButton = () => {
    if (account) {
      deactivate();
      setAutoLoginLS(false);
      setSelectedWallet(null);
    } else {
      sendWalletEvent(WalletEvents.popup);
      setError(false);
      setPending(false);
      setIsOpen(true);
    }
  };

  useEffect(() => {
    if (!active) {
      setSelectedWallet(null);
      setError(false);
      setPending(false);
    }
  }, [active]);

  useAsyncEffect(
    async (isMounted) => {
      if (selectedWallet) return;

      if (connector) {
        setSigner(new Web3Provider(await connector.getProvider()).getSigner());
        const wallet = SUPPORTED_WALLETS.find(
          async (x) => typeof x.connector === typeof connector
        );
        if (isMounted()) if (wallet) setSelectedWallet(wallet);
      }
    },
    [walletModal, connector, selectedWallet]
  );

  const title = error
    ? 'Wallet Error'
    : pending
    ? 'Connecting to ...'
    : 'Connect Wallet';

  return (
    <>
      <button
        onClick={() => connectButton()}
        className={classNameGenerator({
          'btn-outline-secondary btn-sm mr-40': !isMobile,
        })}
      >
        {selectedWallet && account ? (
          <Image src={selectedWallet.icon} alt="" className="w-[22px]" />
        ) : (
          <IconWallet className="text-primary dark:text-primary-light w-[22px]" />
        )}
        {!isMobile && (
          <div className="mx-10">
            {account ? (
              shortenString(account)
            ) : (
              <FormattedMessage id="connect_wallet" />
            )}
          </div>
        )}
      </button>

      <Modal title={title} setIsOpen={setIsOpen} isOpen={walletModal}>
        <div className="max-h-[calc(70vh-60px)] overflow-auto px-20">
          {error || pending ? (
            <>
              <div
                className={`flex justify-center items-center mt-20 mb-40 ${
                  !error && pending ? 'animate-pulse' : ''
                }`}
              >
                <Image
                  src={selectedWallet?.icon}
                  alt="Wallet Logo"
                  className="w-64 h-64 mr-30"
                />
                <h2 className="font-bold text-20">{selectedWallet?.name}</h2>
              </div>
              {error && (
                <div className="bg-error text-white mb-20 p-20 rounded-30 text-center">
                  <p className="font-semibold mb-5">
                    {`Failed Connecting to ${
                      selectedWallet ? selectedWallet.name : 'Wallet'
                    }`}
                  </p>
                  <p className="text-12">Please try again or contact support</p>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col mb-20 mt-10 space-y-15">
              {SUPPORTED_WALLETS.map((wallet, index) => {
                return (
                  <button
                    key={index}
                    onClick={() => tryConnecting(wallet)}
                    className="flex items-center w-full px-16 py-10 border-2 border-grey-2 dark:border-grey-4 rounded-20 hover:border-primary dark:hover:border-primary focus:outline-none focus:border-primary dark:focus:border-primary"
                  >
                    <Image
                      src={wallet.icon}
                      alt=""
                      className="w-32 h-32 mr-20"
                    />
                    {wallet.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};
