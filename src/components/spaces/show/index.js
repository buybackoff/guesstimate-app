import React, {Component, PropTypes} from 'react'
import {connect} from 'react-redux'

import Helmet from 'react-helmet'
import $ from 'jquery'

import {SpaceHeader} from './header'
import {SpaceToolbar} from './Toolbar/index'
import {SpaceSidebar} from './sidebar'
import {ClosedSpaceSidebar} from './closed_sidebar'
import Canvas from 'gComponents/spaces/canvas'
import {NewCalculatorForm} from 'gComponents/calculators/new'
import {EditCalculatorForm} from 'gComponents/calculators/edit'
import {CalculatorCompressedShow} from 'gComponents/calculators/show/CalculatorCompressedShow'
import {ButtonCloseText} from 'gComponents/utility/buttons/close'
import {ButtonEditText, ButtonDeleteText, ButtonExpandText} from 'gComponents/utility/buttons/button'

import {denormalizedSpaceSelector} from '../denormalized-space-selector'

import {allowEdits, forbidEdits} from 'gModules/canvas_state/actions'
import * as spaceActions from 'gModules/spaces/actions'
import * as simulationActions from 'gModules/simulations/actions'
import * as copiedActions from 'gModules/copied/actions'
import * as calculatorActions from 'gModules/calculators/actions'
import {removeSelectedMetrics} from 'gModules/metrics/actions'
import {undo, redo} from 'gModules/checkpoints/actions'
import {navigateFn} from 'gModules/navigation/actions'

import {parseSlurp} from 'lib/slurpParser'

import e from 'gEngine/engine'

import * as elev from 'servers/elev/index'
import * as segment from 'servers/segment'

import './style.css'

function mapStateToProps(state) {
  return {
    me: state.me
  }
}

function spacePrepared(space) {
  return (
    !!space &&
    (_.has(space, 'user.name') || _.has(space, 'organization.name'))
  )
}

const PT = PropTypes

@connect(mapStateToProps)
@connect(denormalizedSpaceSelector)
export default class SpacesShow extends Component {
  displayName: 'RepoDetailPage'

  static propTypes = {
    dispatch: PT.func.isRequired,
    spaceId: PT.number,
    denormalizedSpace: PT.object,
    embed: PT.bool
  }

  state = {
    showSidebar: true,
    attemptedFetch: false,
    showNewCalculatorForm: false,
    showEditCalculatorForm: null,
    showCalculatorId: this.props.showCalculatorId,
    showCalculatorResults: this.props.showCalculatorResults,
  }

  componentWillMount() {
    window.recorder.recordMountEvent(this)

    this.considerFetch(this.props)
    if (!(this.props.embed || this.state.showCalculatorId)) { elev.show() }

    if (_.has(this.props, 'denormalizedSpace.editableByMe')) {
      this.setDefaultEditPermission(_.get(this.props, 'denormalizedSpace.editableByMe'))
    }
  }

  setDefaultEditPermission(editableByMe) {
    if (!!editableByMe && !_.get(this.props, 'denormalizedSpace.canvasState.editsAllowed')) {
      this.props.dispatch(allowEdits())
    } else if (!editableByMe && _.get(this.props, 'denormalizedSpace.canvasState.editsAllowed')) {
      this.props.dispatch(forbidEdits())
    }
  }

  componentWillUnmount() {
    window.recorder.recordUnmountEvent(this)

    if (!this.props.embed) { elev.hide() }
  }

  componentWillUpdate() {
    window.recorder.recordRenderStartEvent(this)
    if (this.props.embed) { $('#intercom-container').remove() }
  }

  componentDidUpdate(prevProps) {
    window.recorder.recordRenderStopEvent(this)

    this.considerFetch(prevProps)
  }

  considerFetch(newProps) {
    const space = newProps.denormalizedSpace

    const hasOwner = _.has(space, 'user.name') || _.has(space, 'organization.name')
    const hasGraph = _.has(space, 'graph')

    const hasData = this.state.attemptedFetch || (hasGraph && hasOwner)

    if (!hasData) {
      this.props.dispatch(spaceActions.fetchById(this._id()))
      this.setState({attemptedFetch: true})
    }
  }

  showCalculatorForm(calcToEdit) {
    elev.hide()
    !!calcToEdit ? this.setState({showEditCalculatorForm: calcToEdit}) : this.setState({showNewCalculatorForm: true})
  }

  showCalculator(showCalculatorId) {
    elev.hide()
    this.setState({showCalculatorForm: false, showCalculatorId})
  }

  hideCalculatorSidebar() {
    elev.show()
    this.setState({showCalculatorId: null, showCalculatorResults: false, showNewCalculatorForm: false, showEditCalculatorForm: null})
  }

  onSave() {
    this.props.dispatch(spaceActions.update(this._id()))
  }

  onRedo() {
    segment.trackUndo(false)
    this.props.dispatch(redo(this._id()))
  }

  onUndo() {
    segment.trackUndo(false)
    this.props.dispatch(undo(this._id()))
  }

  destroy() {
    this.props.dispatch(spaceActions.destroy(this.props.denormalizedSpace))
  }

  onImportSlurp(slurpObj) {
    segment.trackImportSlurp()
    const space = this.props.denormalizedSpace

    const spaceUpdates = parseSlurp(slurpObj, space)
    if (!space.name || !space.description) {
      let nonGraphUpdates = {}
      if (!space.name) {nonGraphUpdates.name = spaceUpdates.name}
      if (!space.description) {nonGraphUpdates.description = spaceUpdates.description}
      this.props.dispatch(spaceActions.update(this._id(), nonGraphUpdates))
    }
    if (!_.isEmpty(spaceUpdates.newMetrics)) {
      this.props.dispatch({type: 'ADD_METRICS', items: spaceUpdates.newMetrics, newGuesstimates: spaceUpdates.newGuesstimates})
      this.props.dispatch(spaceActions.updateGraph(this._id()))
      this.props.dispatch(simulationActions.runSimulations(this._id(), spaceUpdates.newMetrics))
    }
  }

  onPublicSelect() {
    this.props.dispatch(spaceActions.generalUpdate(this._id(), {is_private: false}))
  }

  onPrivateSelect() {
    this.props.dispatch(spaceActions.generalUpdate(this._id(), {is_private: true}))
  }

  onSaveName(name) {
    this.props.dispatch(spaceActions.update(this._id(), {name}))
  }

  onSaveDescription(description) {
    this.props.dispatch(spaceActions.update(this._id(), {description}))
  }

  hideSidebar() {
    segment.trackCloseSidebar()
    this.setState({showSidebar: false})
  }
  openSidebar() {
    segment.trackOpenSidebar()
    this.setState({showSidebar: true})
  }

  _handleCopyModel() {
    segment.trackCopyModel()
    this.props.dispatch(spaceActions.copy(this._id()))
  }

  onCopy(via_keyboard) {
    segment.trackCopyMetric(via_keyboard)
    this.props.dispatch(copiedActions.copy(this._id()))
  }

  onPaste(via_keyboard) {
    segment.trackPasteMetric(via_keyboard)
    this.props.dispatch(copiedActions.paste(this._id()))
  }

  onDeleteMetrics() {
    this.props.dispatch(removeSelectedMetrics(this.props.spaceId))
  }

  onCut(via_keyboard) {
    segment.trackCutMetric(via_keyboard)
    this.props.dispatch(copiedActions.cut(this._id()))
  }

  _id() {
    return parseInt(this.props.spaceId)
  }

  calculatorFormHeader() {
    return (
      <div className='row'>
        <div className='col-xs-8'><h2>{`${this.state.showNewCalculatorForm ? 'New' : 'Edit'} Calculator`}</h2></div>
        <div className='col-xs-4 button-close-text'><ButtonCloseText onClick={this.hideCalculatorSidebar.bind(this)}/></div>
      </div>
    )
  }

  showCalculatorHeader() {
    const {state: {showCalculatorId}, props: {denormalizedSpace: {editableByMe, calculators}}} = this
    return (
      <div className='row'>
        <div className='col-xs-12'>
          <div className='button-close-text'>
            <ButtonExpandText onClick={navigateFn(`/calculators/${showCalculatorId}`)}/>
            {editableByMe && 
              <ButtonEditText onClick={() => {this.setState({showEditCalculatorForm: calculators.find(c => c.id === showCalculatorId)})}}/>
            }
            {editableByMe &&
              <ButtonDeleteText onClick={
                () => {
                  this.props.dispatch(calculatorActions.destroy(showCalculatorId))
                  this.hideCalculatorSidebar()
                }
              }/>
            }
            <ButtonCloseText onClick={this.hideCalculatorSidebar.bind(this)}/>
          </div>
        </div>
      </div>
    )
  }

  calculatorSidebar() {
    const {state: {showNewCalculatorForm, showEditCalculatorForm, showCalculatorResults, showCalculatorId}, props: {denormalizedSpace}} = this

    if (!showNewCalculatorForm && !showEditCalculatorForm && !showCalculatorId) { return false }

    const header = (showNewCalculatorForm || showEditCalculatorForm) ? this.calculatorFormHeader() : this.showCalculatorHeader()
    let main
    if (showNewCalculatorForm) {
      main = <NewCalculatorForm
        space={denormalizedSpace}
        onCalculatorSave={({id}) => this.setState({showNewCalculatorForm: false, showCalculatorId: id})}
      />
    } else if (!!showEditCalculatorForm) {
      main = <EditCalculatorForm 
        space={denormalizedSpace}
        calculator={this.state.showEditCalculatorForm}
        onCalculatorSave={({id}) => this.setState({showEditCalculatorForm: null, showCalculatorId: id})}
      />
    } else {
      main = <CalculatorCompressedShow calculatorId={showCalculatorId} startFilled={showCalculatorResults}/>
    }

    return (
      <div className='SpaceRightSidebar'>
        <div className='SpaceRightSidebar--padded-area'>{header}</div>
        <hr className='SpaceRightSidebar--divider'/>
        {main}
      </div>
    )
  }

  render() {
    const space = this.props.denormalizedSpace
    if (!spacePrepared(space)) { return <div className='spaceShow'></div> }

    const sidebarIsViseable = space.editableByMe || !_.isEmpty(space.description)

    const isLoggedIn = e.me.isLoggedIn(this.props.me)
    if (this.props.embed) {
      return (
        <div className='spaceShow screenshot'>
          <Canvas denormalizedSpace={space} overflow={'hidden'} screenshot={true}/>
        </div>
      )
    }

    const hasOrg = _.has(space, 'organization.name')
    const owner = hasOrg ? space.organization : space.user
    const ownerUrl = hasOrg ? e.organization.url(space.organization) : e.user.url(space.user)

    const canBePrivate = hasOrg ? e.organization.canMakeMorePrivateModels(space.organization) : e.me.canMakeMorePrivateModels(this.props.me)

    const authorCallout = `Made by ${owner.name}`
    const tagDescription = _.isEmpty(space.description) ? authorCallout : `${authorCallout}: ${space.description}`

    return (
      <div className='spaceShow'>
        {!space.name &&
          <Helmet
            meta={[
              {name: 'Description', content: tagDescription},
              {property: 'og:description', content: tagDescription},
              {property: 'og:site_name', content: 'Guesstimate'},
              {property: 'og:image', content: space.big_screenshot},
            ]}
          />
        }
        {space.name &&
          <Helmet
            title={space.name}
            meta={[
              {name: 'Description', content: tagDescription},
              {property: 'og:title', content: space.name},
              {property: 'og:description', content: tagDescription},
              {property: 'og:site_name', content: 'Guesstimate'},
              {property: 'og:image', content: space.big_screenshot},
            ]}
          />
        }

        <div className='hero-unit'>
          <SpaceHeader
            name={space.name}
            isPrivate={space.is_private}
            editableByMe={space.editableByMe}
            canBePrivate={canBePrivate}
            ownerName={owner.name}
            ownerPicture={owner.picture}
            ownerUrl={ownerUrl}
            onSaveName={this.onSaveName.bind(this)}
            onPublicSelect={this.onPublicSelect.bind(this)}
            onPrivateSelect={this.onPrivateSelect.bind(this)}
          />

          <SpaceToolbar
            editsAllowed={space.canvasState.editsAllowed}
            onAllowEdits={() => {
              segment.trackSwitchToEditMode()
              this.props.dispatch(allowEdits())
            }}
            onForbidEdits={() => {
              segment.trackSwitchToViewMode()
              this.props.dispatch(forbidEdits())
            }}
            isLoggedIn={isLoggedIn}
            onDestroy={this.destroy.bind(this)}
            onCopyModel={this._handleCopyModel.bind(this)}
            onCopyMetrics={this.onCopy.bind(this, false)}
            onPasteMetrics={this.onPaste.bind(this, false)}
            onDeleteMetrics={this.onDeleteMetrics.bind(this)}
            onCutMetrics={this.onCut.bind(this, false)}
            isPrivate={space.is_private}
            editableByMe={space.editableByMe}
            actionState={space.canvasState.actionState}
            onUndo={this.onUndo.bind(this)}
            onRedo={this.onRedo.bind(this)}
            canUndo={space.checkpointMetadata.head !== space.checkpointMetadata.length - 1}
            canRedo={space.checkpointMetadata.head !== 0}
            onImportSlurp={this.onImportSlurp.bind(this)}
            calculators={space.calculators}
            showCalculatorForm={this.showCalculatorForm.bind(this)}
            showCalculator={this.showCalculator.bind(this)}
          />
        </div>

        <div className='content'>
          {sidebarIsViseable && this.state.showSidebar &&
            <SpaceSidebar
              description={space.description}
              canEdit={space.editableByMe}
              onClose={this.hideSidebar.bind(this)}
              onSaveDescription={this.onSaveDescription.bind(this)}
            />
          }
          {sidebarIsViseable && !this.state.showSidebar &&
            <ClosedSpaceSidebar onOpen={this.openSidebar.bind(this)}/>
          }
          <Canvas
            denormalizedSpace={space}
            onCopy={this.onCopy.bind(this, true)}
            onPaste={this.onPaste.bind(this, true)}
            onCut={this.onCut.bind(this, true)}
          />
          {this.calculatorSidebar()}
        </div>
      </div>
    )
  }
}
