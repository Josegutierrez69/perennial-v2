import { expect } from 'chai'
import 'hardhat'
import { constants, utils } from 'ethers'

import { InstanceVars, deployProtocol, createProduct, depositTo } from '../helpers/setupHelpers'
import { time } from '../../../../common/testutil'
import { expectPositionEq, expectPrePositionEq } from '../../../../common/testutil/types'

const SECONDS_IN_YEAR = 60 * 60 * 24 * 365
const SECONDS_IN_DAY = 60 * 60 * 24

describe('Lens', () => {
  let instanceVars: InstanceVars

  beforeEach(async () => {
    instanceVars = await deployProtocol()
  })

  it('returns correct lens values', async () => {
    const POSITION = utils.parseEther('0.0001')
    const { user, userB, chainlink, lens, controller } = instanceVars

    expect(await lens.callStatic.controller()).to.equal(controller.address)
    // Setup fees
    const protocolParameter = await controller.parameter()
    protocolParameter.protocolFee = utils.parseEther('0.25')
    controller.updateParameter(protocolParameter)
    const product = await createProduct(instanceVars)

    await depositTo(instanceVars, user, product, utils.parseEther('1000'))
    await depositTo(instanceVars, userB, product, utils.parseEther('1000'))
    await product.connect(user).update(POSITION.mul(-1), 0)
    await product.connect(userB).update(POSITION, 0)

    // Returns the product name
    const info = await lens.callStatic.definition(product.address)
    expect(info.name).to.equal('Squeeth')
    // Returns the product symbol
    expect(info.symbol).to.equal('SQTH')

    // PrePositions should exist for user and userB
    let productSnapshot = (await lens.callStatic['snapshots(address[])']([product.address]))[0]
    let globalPre = productSnapshot.pre
    let globalPosition = productSnapshot.position
    expectPrePositionEq(globalPre, {
      _maker: POSITION,
      _taker: POSITION,
      _makerFee: 0,
      _takerFee: 0,
    })
    expectPositionEq(globalPosition, { maker: 0, taker: 0 })
    expect(productSnapshot.latestVersion.price).to.equal('11388297509860897871140900')
    expect(productSnapshot.rate).to.equal(utils.parseEther('5.00').div(SECONDS_IN_YEAR))
    expect(productSnapshot.dailyRate).to.equal(utils.parseEther('5.00').div(SECONDS_IN_YEAR).mul(SECONDS_IN_DAY))
    expectPositionEq(productSnapshot.openInterest, {
      maker: 0,
      taker: 0,
    })

    let userSnapshot = (await lens.callStatic['snapshots(address,address[])'](user.address, [product.address]))[0]
    expect(userSnapshot.pre).to.equal(POSITION.mul(-1))
    expect(userSnapshot.position).to.equal(0)
    expect(userSnapshot.maintenance).to.equal('341648925295826936134')
    expect(await lens.callStatic.maintenanceRequired(user.address, product.address, 1000)).to.equal('3416489252')

    expect(userSnapshot.openInterest).to.equal(0)
    expect(await lens.callStatic['openInterest(address,address)'](userB.address, product.address)).to.equal(0)

    await chainlink.next() // Update the price

    // PrePositions are zeroed out after price update and settlement
    productSnapshot = await lens.callStatic['snapshot(address)'](product.address)
    globalPre = productSnapshot.pre
    globalPosition = productSnapshot.position
    expectPrePositionEq(globalPre, {
      _maker: 0,
      _taker: 0,
      _makerFee: 0,
      _takerFee: 0,
    })

    userSnapshot = await lens.callStatic['snapshot(address,address)'](user.address, product.address)
    expect(userSnapshot.pre).to.equal(0)

    // Pre -> Position
    expectPositionEq(globalPosition, {
      maker: POSITION,
      taker: POSITION,
    })
    expect(userSnapshot.position).to.equal(POSITION.mul(-1))

    const userBPosition = await lens.callStatic.userPosition(userB.address, product.address)
    expect(userBPosition[0]).to.equal(0)
    expect(userBPosition[1]).to.equal(POSITION)

    // Maintenance required is updated
    expect(await lens.callStatic.maintenanceRequired(user.address, product.address, 1000)).to.equal('3413894945')
    expect(await lens.callStatic.maintenance(user.address, product.address)).to.equal('341389494586618956214')
    // Price is updated
    expect((await lens.callStatic.latestVersion(product.address)).price).to.equal('11379649819553965207140100')
    // Rate is updated
    expect(await lens.callStatic.rate(product.address)).to.equal(utils.parseEther('5.00').div(SECONDS_IN_YEAR))
    expect(await lens.callStatic.dailyRate(product.address)).to.equal(
      utils.parseEther('5.00').div(SECONDS_IN_YEAR).mul(SECONDS_IN_DAY),
    )
    // OpenInterest is updated
    expect(await lens.callStatic['openInterest(address,address)'](user.address, product.address)).to.equal(
      '-1137964981955396520714',
    ) // Price * Position
    expect(await lens.callStatic['openInterest(address,address)'](userB.address, product.address)).to.equal(
      '-1137964981955396520714',
    ) // Price * Position
    expectPositionEq(await lens.callStatic['openInterest(address)'](product.address), {
      maker: '1137964981955396520714',
      taker: '1137964981955396520714',
    })

    // User starts off as not liquidatable before price update
    expect(await lens.callStatic.liquidatable(user.address, product.address)).to.be.false
    expect(await lens.callStatic.maintenance(user.address, product.address)).to.equal('341389494586618956214')

    // Fees before any positions are changed
    let fees = await lens.callStatic.fees(product.address)
    expect(fees._protocol).to.equal(0)
    expect(fees._product).to.equal(0)

    // Big price change
    await chainlink.nextWithPriceModification(price => price.mul(2))

    expect(await lens.callStatic.maintenance(user.address, product.address)).to.equal('1380555115845583562915')
    expect(await lens.callStatic.liquidatable(user.address, product.address)).to.be.true

    // Liquidate the user
    await product.connect(userB).liquidate(user.address)

    expect(await lens.callStatic['collateral(address,address)'](user.address, product.address)).to.equal(
      '-2463736825720737646856',
    )
    expect(await lens.callStatic['collateral(address,address)'](userB.address, product.address)).to.equal(
      '4463720317001203086618',
    )
    expect(await lens.callStatic['collateral(address)'](product.address)).to.equal('1999983491280465439762')

    // Fees are updated
    fees = await lens.callStatic.fees(product.address)
    expect(fees._protocol).to.equal('4127179883640059')
    expect(fees._product).to.equal('12381539650920179')

    await chainlink.next()
    await product.settle(constants.AddressZero)

    await chainlink.next()

    await product.connect(user).settle(user.address)
    const prices = await lens.callStatic.atVersions(product.address, [2472, 2475])
    expect(prices[0].price).to.equal('11388297509860897871140900')
    expect(prices[1].price).to.equal('11628475351618010828602500')
  })
})
