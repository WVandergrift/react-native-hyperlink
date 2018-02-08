/**
* @providesModule Hyperlink
**/

import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { 
	View, 
	Text, 
	Linking, 
	Platform
} from 'react-native'
import LinkPreview from 'react-native-link-preview';

const textPropTypes = Text.propTypes || {}
const { OS } = Platform

class Hyperlink extends Component {
  constructor(props){
    super(props)
    this.linkify = this.linkify.bind(this)
    this.parse = this.parse.bind(this)
    this.linkifyIt = props.linkify || require('linkify-it')()
    this.links = [];
  }

  componentWillReceiveProps ({ linkify = require('linkify-it')() } = {}) {
    this.linkifyIt = linkify
  }

  componentDidMount() {
    // Create a promise to get information for each link
    let _this = this;
    let linkPromises = [];

    links.forEach(function(link){
      linkPromises.push(LinkPreview.getPreview(link.url));
    });

    // Run all link promises
    Promise.all(linkPromises).then(function(results){
      // Successfully retrieved information for all links.
      results.forEach(function(linkData, index){
        Object.assign(_this.links[index], linkData);
      });

      // Notify the parent component that we've processed all found links
      this.props.onLinksProcessed(this.links);
    }, function(error){
      console.error("Failed to get information for links");
    });
  }

  render() {
    const { ...viewProps } = this.props
    delete viewProps.onPress
    delete viewProps.linkDefault
    delete viewProps.onLongPress
    delete viewProps.linkStyle
		
    return (
      <View { ...viewProps } style={ this.props.style }>
        { !this.props.onPress && !this.props.onLongPress && !this.props.linkStyle
          ? this.props.children
          : this.parse(this).props.children }
      </View>
    )
  }

  isTextNested(component) {
    if (!React.isValidElement(component)) 
      throw new Error('Invalid component')
    let { type: { displayName } = {} } = component
    if (displayName !== 'Text') 
      throw new Error('Not a Text component')
    return typeof component.props.children !== 'string'
  }

  linkify(component){
    if (
      !this.linkifyIt.pretest(component.props.children)
      || !this.linkifyIt.test(component.props.children)
    )
      return component

    let elements = []
    let _lastIndex = 0

    const componentProps = {
      ...component.props,
      ref: undefined,
      key: undefined,
    }

    try {
      this.linkifyIt.match(component.props.children).forEach(({ index, lastIndex, text, url }) => {
        let nonLinkedText = component.props.children.substring(_lastIndex, index)
        nonLinkedText && elements.push(nonLinkedText)
        _lastIndex = lastIndex
        if (this.props.linkText)
          text = typeof this.props.linkText === 'function'
              ? this.props.linkText(url)
              : this.props.linkText
        
        // Add the parsed link to our links array
        this.links.push({ url: url, text: text });

        if (OS !== 'web') {
          componentProps.onLongPress = () => this.props.onLongPress && this.props.onLongPress(url, text)
        }

        elements.push(
          <Text
            { ...componentProps }
            key={ url + index }
            style={ [ component.props.style, this.props.linkStyle ] }
            onPress={ () => this.props.onPress && this.props.onPress(url, text) }
          >
            { text }
          </Text>
        )
      })

      elements.push(component.props.children.substring(_lastIndex, component.props.children.length))
      return React.cloneElement(component, componentProps, elements)
    } catch (err) {
      return component
    }
  }

  parse (component) {
    let { props: { children} = {}, type: { displayName } = {} } = component
    if (!children)
      return component

    const componentProps = {
      ...component.props,
      ref: undefined,
      key: undefined,
    }

    return React.cloneElement(component, componentProps, React.Children.map(children, child => {
      let { type : { displayName } = {} } = child
      if (typeof child === 'string' && this.linkifyIt.pretest(child))
        return this.linkify(<Text { ...componentProps } style={ component.props.style }>{ child }</Text>)
		  if (displayName === 'Text' && !this.isTextNested(child))
			  return this.linkify(child)
		  return this.parse(child)
    }))
  }
}

Hyperlink.propTypes = {
  linkDefault: PropTypes.bool,
  linkify: PropTypes.object,
  linkStyle: textPropTypes.style,
  linkText: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.func,
  ]),
  onPress: PropTypes.func,
  onLongPress: PropTypes.func,
  onLinksProcessed: PropTypes.func
}

export default class extends Component {
  constructor (props) {
    super(props)
    this.handleLink = this.handleLink.bind(this)
  }

  handleLink (url) {
	Linking.canOpenURL(url)
		.then(supported => supported && Linking.openURL(url))
  }

  render () {
    const onPress = this.handleLink || this.props.onPress
	if (this.props.linkDefault) 
		return <Hyperlink { ...this.props } onPress={ onPress }/>
    return <Hyperlink { ...this.props } />
  }
}
