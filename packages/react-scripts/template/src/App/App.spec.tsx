import 'jest-enzyme';

import * as Adapter from 'enzyme-adapter-react-16';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { configure, shallow } from 'enzyme';

import App from './App';

// tslint:disable-next-line:no-any
configure({ adapter: new Adapter() });

test('renders without crashing', () => {
  const div = document.createElement('div');
  ReactDOM.render(<App />, div);
});

test('App component contains an element with container css class', () => {
  const wrapper = shallow(<App />);
  expect(wrapper.find('.App')).toHaveLength(1);
});