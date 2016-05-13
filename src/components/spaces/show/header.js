import React, {Component} from 'react'
import StandardDropdownMenu from 'gComponents/utility/standard-dropdown-menu'
import CanvasViewForm from './canvasViewForm.js'
import Icon from 'react-fa'
import e from 'gEngine/engine'
import DropDown from 'gComponents/utility/drop-down/index.js'
import {DropDownListElement} from 'gComponents/utility/drop-down/index.js'
import {SpaceName} from './spaceName.js'
import {PrivacyToggle} from './privacy-toggle/index.js'
import './header.css'

import {
  ShareButtons,
  ShareCounts,
  generateShareIcon
} from 'react-share'

const ProgressMessage = ({actionState}) => (
  <div className='saveMessage'>
    {actionState == 'SAVING' && 'Saving...'}
    {actionState == 'COPYING' && 'Copying...'}
    {actionState == 'CREATING' && 'Creating a new model...'}
    {actionState == 'ERROR' &&
      <div className='ui red horizontal label'>
        ERROR SAVING
      </div>
    }
    {actionState == 'ERROR_COPYING' &&
      <div className='ui red horizontal label'>
        ERROR COPYING
      </div>
    }
    {actionState == 'ERROR_CREATING' &&
      <div className='ui red horizontal label'>
        ERROR CREATING NEW MODEL
      </div>
    }
    {actionState == 'SAVED' && 'All changes saved'}
    {actionState == 'COPIED' && 'Successfully copied'}
    {actionState == 'CREATED' && 'New model created'}
  </div>
)

const SpaceHeader = ({canBePrivate, space, isLoggedIn, onSave, onCopy, onDestroy, onPublicSelect, onPrivateSelect, onSaveName}) => {
  let privacy_header = (<span><Icon name='globe'/> Public</span>)
  if (space.is_private) {
    privacy_header = (<span><Icon name='lock'/> Private</span>)
  }

  const {FacebookShareButton, TwitterShareButton, LinkedinShareButton} = ShareButtons
  const {FacebookShareCount, TwitterShareCount, LinkedinShareCount} = ShareCounts
  const FacebookIcon = generateShareIcon('facebook')
  const TwitterIcon = generateShareIcon('twitter')
  const LinkedinIcon = generateShareIcon('linkedin')

  return (
    <div className='header'>

      <div className='header-name'>
        <SpaceName
            name={space.name}
            editableByMe={space.editableByMe}
            onSave={onSaveName}
        />

        <div className='share-buttons'>
          <FacebookShareButton url={`https://www.getguesstimate.com/models/${space.id}`} title={space.name}>
            <FacebookIcon size={32} round={true} />
            {false && <FacebookShareCount url={`https://www.getguesstimate.com/models/${space.id}`} />}
          </FacebookShareButton>
        </div>
        <div className='share-buttons'>
          <TwitterShareButton url={`https://www.getguesstimate.com/models/${space.id}`} title={space.name}>
            <TwitterIcon size={32} round={true} />
            {false && <TwitterShareCount url={`https://www.getguesstimate.com/models/${space.id}`} />}
          </TwitterShareButton>
        </div>
        <div className='share-buttons'>
          <LinkedinShareButton url={`https://www.getguesstimate.com/models/${space.id}`} title={space.name}>
            <LinkedinIcon size={32} round={true} />
            {false && <LinkedinShareCount url={`https://www.getguesstimate.com/models/${space.id}`} />}
          </LinkedinShareButton>
        </div>
      </div>

      <div className='header-actions'>
        <CanvasViewForm/>

        {space.editableByMe &&
          <DropDown
              headerText={'Model Actions'}
              openLink={<a className='space-header-action'>Model Actions</a>}
              position='right'
          >
            <ul>
              <DropDownListElement icon={'warning'} header='Delete Model' onMouseDown={onDestroy}/>
            </ul>
          </DropDown>
        }

        {space.editableByMe &&
          <PrivacyToggle
            headerText={'Privacy Options'}
            openLink={<a className='space-header-action'>{privacy_header}</a>}
            position='right'
            isPrivateSelectionInvalid={!canBePrivate}
            isPrivate={space.is_private}
            onPublicSelect={onPublicSelect}
            onPrivateSelect={onPrivateSelect}
          />
        }
        { space && isLoggedIn &&
          <div onMouseDown={onCopy} className='copy-button'>
            <a className='space-header-action'><Icon name='copy'/> Copy</a>
          </div>
        }
        <ProgressMessage actionState={space.canvasState.actionState}/>
      </div>
    </div>
  )
}

export default SpaceHeader
