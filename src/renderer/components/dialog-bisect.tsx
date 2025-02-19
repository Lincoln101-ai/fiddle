import { Button, ButtonGroup, Callout, Dialog, Label } from '@blueprintjs/core';
import { observer } from 'mobx-react';
import * as React from 'react';

import { RunnableVersion } from '../../interfaces';
import { Bisector } from '../bisect';
import { AppState } from '../state';
import { VersionSelect } from './version-select';

export interface BisectDialogProps {
  appState: AppState;
}

export interface BisectDialogState {
  startIndex: number;
  endIndex: number;
  allVersions: Array<RunnableVersion>;
  showHelp?: boolean;
}

/**
 * The "add version" dialog allows users to add custom builds of Electron.
 *
 * @class BisectDialog
 * @extends {React.Component<BisectDialogProps, BisectDialogState>}
 */
@observer
export class BisectDialog extends React.Component<BisectDialogProps, BisectDialogState> {
  constructor(props: BisectDialogProps) {
    super(props);

    this.onSubmit = this.onSubmit.bind(this);
    this.onClose = this.onClose.bind(this);
    this.onBeginSelect = this.onBeginSelect.bind(this);
    this.onEndSelect = this.onEndSelect.bind(this);
    this.showHelp = this.showHelp.bind(this);
    this.isEarliestItemDisabled = this.isEarliestItemDisabled.bind(this);
    this.isLatestItemDisabled = this.isLatestItemDisabled.bind(this);

    this.state = {
      allVersions: this.props.appState.versionsToShow,
      startIndex: 10,
      endIndex: 0
    };
  }

  public onBeginSelect(version: RunnableVersion) {
    this.setState({ startIndex: this.state.allVersions.indexOf(version) });
  }

  public onEndSelect(version: RunnableVersion) {
    this.setState({ endIndex: this.state.allVersions.indexOf(version) });
  }

  /**
   * Handles the submission of the dialog
   *
   * @returns {Promise<void>}
   */
  public async onSubmit(): Promise<void> {
    const { endIndex, startIndex, allVersions } = this.state;
    const { appState } = this.props;

    if (endIndex === undefined || startIndex === undefined) {
      return;
    }

    const bisectRange = allVersions
      .slice(endIndex, startIndex + 1)
      .reverse();

    appState.Bisector = new Bisector(bisectRange);
    const initialBisectPivot = appState.Bisector.getCurrentVersion().version;
    appState.setVersion(initialBisectPivot);
    this.onClose();
  }

  /**
   * Closes the dialog
   */
  public onClose() {
    this.props.appState.isBisectDialogShowing = false;
  }

  /**
   * Shows the additional help
   */
  public showHelp() {
    this.setState({ showHelp: true });
  }

  /**
   * Can we get this show on the road?
   */
  get canSubmit(): boolean {
    return this.state.startIndex > this.state.endIndex;
  }

  /**
   * Renders the buttons
   */
  get buttons() {
    return [
      (
        <Button
          icon='play'
          key='submit'
          disabled={!this.canSubmit}
          onClick={this.onSubmit}
          text='Begin'
        />
      ), (
        <Button
          icon='cross'
          key='cancel'
          onClick={this.onClose}
          text='Cancel'
        />
      )
    ];
  }

  /**
   * Renders the help
   */
  get help() {
    let moreHelp = (
      <Button
        icon='help'
        text='Show help'
        onClick={this.showHelp}
      />
    );

    if (this.state.showHelp) {
      moreHelp = (
        <>
          <p>
            First, write a fiddle that reproduces a bug or an issue. Then, select the earliest version to
            start your search with. Typically, that's the "last known good" version that did not have the bug.
            Then, select that latest version to end the search with, usually the "first known bad" version.
          </p>
          <p>
            Once you begin your bisect, Fiddle will run your fiddle with a number of Electron versions, closing
            in on the version that introduced the bug. Once completed, you will know which Electron version
            introduced your issue.
          </p>
        </>
      );
    }

    return (
      <Callout style={{ marginTop: 0, marginBottom: '1rem' }}>
        <p>
          A "bisect" is a popular method <a href='https://git-scm.com/docs/git-bisect' target='_blank'>
          borrowed from <code>git</code></a> for learning which version of Electron introduced a bug. This
          tool helps you perform a bisect.
        </p>
        {moreHelp}
      </Callout>
    );
  }

  public render() {
    const { isBisectDialogShowing } = this.props.appState;
    const { startIndex, endIndex, allVersions } = this.state;

    return (
      <Dialog
        isOpen={isBisectDialogShowing}
        onClose={this.onClose}
        title='Start a bisect session'
        className='dialog-add-version'
      >
        <div className='bp3-dialog-body'>
          {this.help}
          <Label>
            Earliest Version (Last "known good" version)
            <ButtonGroup fill={true}>
              <VersionSelect
                currentVersion={allVersions[startIndex]}
                appState={this.props.appState}
                onVersionSelect={this.onBeginSelect}
                itemDisabled={this.isEarliestItemDisabled}
              />
            </ButtonGroup>
          </Label>
          <Label>
            Latest Version (First "known bad" version)
            <ButtonGroup fill={true}>
              <VersionSelect
                currentVersion={allVersions[endIndex]}
                appState={this.props.appState}
                onVersionSelect={this.onEndSelect}
                itemDisabled={this.isLatestItemDisabled}
              />
            </ButtonGroup>
          </Label>
        </div>
        <div className='bp3-dialog-footer'>
          <div className='bp3-dialog-footer-actions'>
            {this.buttons}
          </div>
        </div>
      </Dialog>
    );
  }

  /**
   * Should an item in the "earliest version" dropdown be disabled?
   *
   * @param {RunnableVersion} version
   * @returns {boolean}
   */
  public isEarliestItemDisabled(version: RunnableVersion): boolean {
    const { allVersions, endIndex } = this.state;

    // In the array, "newer" versions will have a lower index.
    // 0: 5.0.0
    // 1: 4.0.0
    // 2: 3.0.0
    // ...
    return allVersions.indexOf(version) < endIndex + 1;
  }

  /**
   * Should an item in the "latest version" dropdown be disabled?
   *
   * @param {RunnableVersion} version
   * @returns {boolean}
   */
  public isLatestItemDisabled(version: RunnableVersion): boolean {
    const { allVersions, startIndex } = this.state;

    return allVersions.indexOf(version) > startIndex - 1;
  }
}
