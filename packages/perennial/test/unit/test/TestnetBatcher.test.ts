import { FakeContract, smock } from '@defi-wonderland/smock'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { expect, use } from 'chai'
import { utils } from 'ethers'
import HRE from 'hardhat'
import { nextContractAddress } from '../../../../common/testutil/contract'

import { IERC20Metadata, TestnetReserve, TestnetBatcher, TestnetBatcher__factory } from '../../../types/generated'

const { ethers } = HRE
use(smock.matchers)

describe('TestnetBatcher', () => {
  let owner: SignerWithAddress
  let user: SignerWithAddress
  let account: SignerWithAddress
  let reserve: FakeContract<TestnetReserve>
  let usdc: FakeContract<IERC20Metadata>
  let dsu: FakeContract<IERC20Metadata>
  let batcher: TestnetBatcher

  beforeEach(async () => {
    ;[owner, user, account] = await ethers.getSigners()

    reserve = await smock.fake<TestnetReserve>('TestnetReserve')
    usdc = await smock.fake<IERC20Metadata>('IERC20Metadata')
    dsu = await smock.fake<IERC20Metadata>('IERC20Metadata')
    reserve.USDC.returns(usdc.address)
    reserve.DSU.returns(dsu.address)

    const batcherAddress = await nextContractAddress(owner, 0)
    usdc.allowance.whenCalledWith(batcherAddress, reserve.address).returns(0)
    usdc.approve.whenCalledWith(reserve.address, ethers.constants.MaxUint256).returns(true)
    dsu.allowance.whenCalledWith(batcherAddress, reserve.address).returns(0)
    dsu.approve.whenCalledWith(reserve.address, ethers.constants.MaxUint256).returns(true)

    batcher = await new TestnetBatcher__factory(owner).deploy(reserve.address)
  })

  describe('#constructor', () => {
    it('constructs correctly', async () => {
      expect(await batcher.reserve()).to.equal(reserve.address)
    })
  })

  describe('#totalBalance', () => {
    it('returns max uint', async () => {
      expect(await batcher.totalBalance()).to.equal(ethers.constants.MaxUint256)
    })
  })

  describe('#wrap', () => {
    it('pulls USDC from the sender, wraps it as DSU', async () => {
      usdc.transferFrom.whenCalledWith(user.address, batcher.address, 10e6).returns(true)
      reserve.mint.whenCalledWith(utils.parseEther('10'), account.address).returns(true)

      await expect(
        batcher.connect(user).wrap(
          utils.parseEther('10'),
          account.address,
          { gasLimit: 30e6 }, // https://github.com/defi-wonderland/smock/issues/99
        ),
      )
        .to.emit(batcher, 'Wrap')
        .withArgs(account.address, utils.parseEther('10'))
    })
  })

  describe('#unwrap', () => {
    it('reverts with NotImplemented', async () => {
      await expect(batcher.unwrap(utils.parseEther('10'), account.address)).to.be.revertedWith(
        'BatcherNotImplementedError()',
      )
    })
  })

  describe('#rebalance', () => {
    it('returns', async () => {
      await expect(batcher.rebalance()).to.not.be.reverted
    })
  })
})