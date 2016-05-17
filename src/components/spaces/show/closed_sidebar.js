// TODO(matthew): Clean up imports. (e.g. get rid of everything...)
import React, {Component, PropTypes} from 'react'
import Icon from 'react-fa'

// TODO(matthew): Make functional
export default class ClosedSpaceSidebar extends Component {
  render() {
    return (
      <div className='ClosedSpaceSidebar'>
        <div className='ui button blue small open' onClick={this.props.onOpen}>
          <Icon name='chevron-right'/>
        </div>
      </div>
    )
  }
}
