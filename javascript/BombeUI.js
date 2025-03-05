/**
 * @class BombeUI
 * @extends Bombe
 *
 * @description Adds and manages an interface for a Bombe.
 */
class BombeUI extends Bombe
{

	/** @private */
	_controlsAnchor;

	/** @private */
	_overlayAnchor;

	/** @private */
	_overlays;

	/** @private */
	_selectedOverlay = null;



	/** @private */
	_defaultScramblers;

	/** @private */
	_defaultReflectors;

	/** @private */
	_defaultScramblerCasing;



	/** @private */
	_dboardUI;

	/** @private */
	_drumUI;

	/** @private */
	_testRegisterUI;

	/** @private */
	_placeholderUI;



	/** @private */
	_currentInput = 0;



	/** @private {Number[]} */
	_scramblerReadouts = [ 0, 0, 0 ];



	/** @public {Number} */
	static OVERLAY_ROUNDED_CORNERS = 10;

	/** @public {Number} */
	static ANIMATION_SPEED_MAX = 800;



	/** @public {String} */
	static POWER_ANIMATION_TO_DISABLE =
		"#bombeui-controls-test-register-text," +
		"#bombeui-controls-test-register-wrapper," +
		"#bombeui-controls-current-input-text," +
		"#bombeui-controls-current-input-wrapper," +
		"#bombeui-controls-rotate-all-text," +
		"#bombeui-controls-rotate-all-wrapper," +
		"#bombeui-controls-scrambler-readout-text," +
		"[id^=bombeui-controls-scrambler-readout-up]," +
		"[id^=bombeui-controls-scrambler-readout-output]," +
		"[id^=bombeui-controls-scrambler-readout-down]," +
		"#bombeui-controls-search-button," +
		"#bombeui-controls-add-drum-button";

	/** @public {String} */
	static SEARCH_TO_DISABLE =
		"#bombeui-controls-test-register-text," +
		"#bombeui-controls-test-register-wrapper," +
		"#bombeui-controls-current-input-text," +
		"#bombeui-controls-current-input-wrapper," +
		"#bombeui-controls-rotate-all-text," +
		"#bombeui-controls-rotate-all-wrapper," +
		"#bombeui-controls-scrambler-readout-text," +
		"[id^=bombeui-controls-scrambler-readout-up]," +
		"[id^=bombeui-controls-scrambler-readout-output]," +
		"[id^=bombeui-controls-scrambler-readout-down]," +
		"#bombeui-controls-power-button," +
		"#bombeui-controls-animation-speed-text," +
		"#bombeui-controls-animation-speed-output," +
		"#bombeui-controls-animation-speed-slider," +
		"#bombeui-controls-add-drum-button";

	/** @public {Array<String>} */
	static DRUM_PROPERTIES_TO_WATCH = [
		"scramblers",
		"rotations",
		"rotation",
		"inverseRotation"
	];

	/** @public {Array<String>} */
	static ROMAN_NUMERALS = [ "I", "II", "III", "IV", "V" ];




	/**
	 * @name constructor
	 *
	 * @param svgRoot	D3 SVG element selection.
	 * @param controlsAnchor
	 * @param {String} alphabet
	 * @param {String} steckerAlphabet
	 * @param {Boolean} dboard	Whether or not to use a dboard.
	 * @param {Number} testRegisterIndex	The cable to put the test register on.
	 * @param {Array<Scrambler>} defaultScramblers	An array of five default scramblers.
	 * @param {Array<Scrambler>} defaultReflectors An array of two reflector scramblers.
	 * @param {Number} [animationSpeed = 100]	The initial speed of animations.
	 */
	constructor ( svgRoot, controlsAnchor, alphabet, steckerAlphabet, dboard, testRegisterIndex, defaultScramblers, defaultReflectors, animationSpeed = 100 )
	{
		/* Construct the superclass */
		super ( svgRoot, alphabet, steckerAlphabet, dboard, testRegisterIndex, animationSpeed );

		/* Save the default scramblers */
		this._defaultScramblers = defaultScramblers.map ( s => s.clone () );
		this._defaultReflectors = defaultReflectors.map ( s => s.clone () );

		/* Create the default scrambler casing */
		const defaultScramblersForCasing = this._defaultScramblers.slice ( 0, 3 );
		defaultScramblersForCasing.push ( this._defaultReflectors [ 0 ] );
		this._defaultScramblerCasing = new ScramblerCasing ( defaultScramblersForCasing );
		
		/* Save the controls anchor */
		this._controlsAnchor = controlsAnchor;

		/* Add a new anchor to the svgRoot */
		this._overlayAnchor = this._svgRoot.append ( "g" );

		/* Create the test register and diagonal board overlays */
		const testRegisterOverlay = this._overlayAnchor
			.append ( "rect" )
			.classed ( "bombeui-overlay", true )
			.attr ( "rx", BombeUI.OVERLAY_ROUNDED_CORNERS );
		const dBoardOverlay = this._overlayAnchor
			.append ( "rect" )
			.classed ( "bombeui-overlay", true )
			.attr ( "rx", BombeUI.OVERLAY_ROUNDED_CORNERS );

		/* Get references to the test register and dboard columns (so that they can be captured by lambdas below) */
		const testRegisterColumn = this._plugColumns [ 0 ];
		const dBoardColumn = this._plugColumns [ 1 ];

		/* Add the onclick handlers */
		testRegisterOverlay.on ( "click", () => this._overlayClicked ( testRegisterOverlay, testRegisterColumn ) );
		dBoardOverlay.on ( "click", () => this._overlayClicked ( dBoardOverlay, dBoardColumn ) );

		/* Inject a function to update the test register overlay's position into the column */
		const oldPositionColumn = testRegisterColumn._positionColumn.bind ( testRegisterColumn );
		testRegisterColumn._positionColumn = function ( pos )
		{
			/* Call the original function */
			oldPositionColumn ( pos );

			/* Get the x and y positions */
			const x = parseFloat ( this._cableLabels [ 0 ].attr ( "x" ) ) - this._actualColumnSeparation / 2;
			const y = this._plugs [ 0 ].pos.y - this._actualCableSeparation / 2;

			/* Calculate the width and height */
			const width = this._plugs [ 0 ].pos.x - x + this._plugColumnSpacing - this._actualColumnSeparation / 2;
			const height = this._cableSpacing * this.alphabet.length;

			/* Also update the overlay */
			testRegisterOverlay
				.attr ( "x", x )
				.attr ( "y", y )
				.attr ( "width", width )
				.attr ( "height", height );
		};

		/* Inject a function to update the dboard overlay's position into the column.
		 * This one is more complicated, since we need to bind it to one of the junctions on the diagonal board
		 * so that the overlay resizes as the diagonal board opens and closes.
		 */
		const dboardJunctionAnchor = dBoardColumn._plugs [ this.alphabet.length - 1 ]._junctions [ this.alphabet.length - 1 ];
		const junctionPosDesc = Object.getOwnPropertyDescriptor ( dboardJunctionAnchor, "pos" ) || Object.getOwnPropertyDescriptor ( Junction.prototype, "pos" );
		Object.defineProperty ( dboardJunctionAnchor, "pos",
			{
				configurable: true,
				enumerable: true,
				get: function () { return junctionPosDesc.get.call ( this ); },
				set: function ( pos )
				{
					/* Call the original function */
					junctionPosDesc.set.call ( this, pos );

					/* Get the x and y positions */
					const x = dBoardColumn._truePos.x - dBoardColumn._actualColumnSeparation / 2;
					const y = dBoardColumn._truePos.y - dBoardColumn._actualCableSeparation / 2;

					/* Calculate the width and height */
					const width = this.pos.x - x + dBoardColumn._actualColumnSeparation / 2;
					const height = dBoardColumn._cableSpacing * dBoardColumn.alphabet.length;

					/* Also update the overlay */
					dBoardOverlay
						.attr ( "x", x )
						.attr ( "y", y )
						.attr ( "width", width )
						.attr ( "height", height );
				}
			} );

		/* Position the overlays */
		testRegisterColumn._positionColumn ( testRegisterColumn.pos );
		dBoardColumn._positionColumn ( dBoardColumn.pos );

		/* Append the overlays to their array */
		this._overlays = [];
		this._overlays.push ( testRegisterOverlay );
		this._overlays.push ( dBoardOverlay );

		/* Class the control anchor */
		this._controlsAnchor
			.classed ( "bombeui-controls-container", true );


		
		/* TEST REGISTER UI */

		/* Create the test register UI */
		this._testRegisterUI = d3.create ( "template" );

		/* Separator */
		this._testRegisterUI.append ( "span" ).classed ( "bombeui-controls-separator", true );

		/* TEST REGISTER SELECTOR */
		{
			/* Add a label for the test register selector */
			this._testRegisterUI.append ( "p" )
				.attr ( "id", "bombeui-controls-test-register-text" )
				.attr ( "class", "bombeui-controls-text" )
				.text ( "Test Register" );

			/* Create the wrapper */
			const testRegisterUISelectorDiv = this._testRegisterUI.append ( "div" )
				.attr ( "id", "bombeui-controls-test-register-wrapper" )
				.attr ( "class", "bombeui-controls-vertical-selector-wrapper" );

			/* Add the elements */
			testRegisterUISelectorDiv.append ( "button" )
				.attr ( "id", "bombeui-controls-test-register-up" )
				.attr ( "class", "bombeui-controls-vertical-selector-button" )
				.text ( "\u25B2" );
			testRegisterUISelectorDiv.append ( "span" )
				.attr ( "id", "bombeui-controls-test-register-output" )
				.attr ( "class", "bombeui-controls-vertical-selector-output" )
			testRegisterUISelectorDiv.append ( "button" )
				.attr ( "id", "bombeui-controls-test-register-down" )
				.attr ( "class", "bombeui-controls-vertical-selector-button" )
				.text ( "\u25BC" );
		}


		/* Separator */
		this._testRegisterUI.append ( "span" ).classed ( "bombeui-controls-separator", true );

		/* CURRENT INPUT SELECTOR */
		{
			/* Add a label for the current input selector */
			this._testRegisterUI.append ( "p" )
				.attr ( "id", "bombeui-controls-current-input-text" )
				.attr ( "class", "bombeui-controls-text" )
				.text ( "Input Current At" );

			/* Create the wrapper */
			const testRegisterUISelectorDiv = this._testRegisterUI.append ( "div" )
				.attr ( "id", "bombeui-controls-current-input-wrapper" )
				.attr ( "class", "bombeui-controls-vertical-selector-wrapper" );

			/* Add the elements */
			testRegisterUISelectorDiv.append ( "button" )
				.attr ( "id", "bombeui-controls-current-input-up" )
				.attr ( "class", "bombeui-controls-vertical-selector-button" )
				.text ( "\u25B2" );
			testRegisterUISelectorDiv.append ( "span" )
				.attr ( "id", "bombeui-controls-current-input-output" )
				.attr ( "class", "bombeui-controls-vertical-selector-output" )
			testRegisterUISelectorDiv.append ( "button" )
				.attr ( "id", "bombeui-controls-current-input-down" )
				.attr ( "class", "bombeui-controls-vertical-selector-button" )
				.text ( "\u25BC" );
		}

		/* Separator */
		this._testRegisterUI.append ( "span" ).classed ( "bombeui-controls-separator", true );

		/* ROTATE ALL BUTTONS */
		{
			/* Add a label for the reflector selector */
			this._testRegisterUI.append ( "p" )
				.attr ( "id", "bombeui-controls-rotate-all-text" )
				.attr ( "class", "bombeui-controls-text" )
				.text ( "Rotate All" )

			/* Create the wrapper */
			const testRegisterUISelectorDiv = this._testRegisterUI.append ( "div" )
				.attr ( "id", "bombeui-controls-rotate-all-wrapper" )
				.attr ( "class", "bombeui-controls-vertical-selector-wrapper" );

			/* Add the elements */
			testRegisterUISelectorDiv.append ( "button" )
				.attr ( "id", "bombeui-controls-rotate-all-up" )
				.attr ( "class", "bombeui-controls-vertical-selector-button" )
				.text ( "\u25B2" );
			testRegisterUISelectorDiv.append ( "button" )
				.attr ( "id", "bombeui-controls-rotate-all-down" )
				.attr ( "class", "bombeui-controls-vertical-selector-button" )
				.text ( "\u25BC" );
		}

		/* Separator */
		this._testRegisterUI.append ( "span" ).classed ( "bombeui-controls-separator", true );

		/* SCRAMBLER READOUT */
		{
			/* Add a label for the buttons */
			this._testRegisterUI.append ( "p" )
				.attr ( "id", "bombeui-controls-scrambler-readout-text" )
				.attr ( "class", "bombeui-controls-text" )
				.text ( "Scrambler Readout" )

			/* Create three selectors for the scramblers */
			for ( let i = 0; i < 3; ++i )
			{
				/* Create the wrapper */
				const scramblerReadoutDiv = this._testRegisterUI.append ( "div" )
					.attr ( "class", "bombeui-controls-vertical-selector-wrapper" );

				/* Add the elements */
				scramblerReadoutDiv.append ( "button" )
					.attr ( "id", "bombeui-controls-scrambler-readout-up-" + i )
					.attr ( "class", "bombeui-controls-vertical-selector-button" )
					.text ( "\u25B2" );
				scramblerReadoutDiv.append ( "span" )
					.attr ( "id", "bombeui-controls-scrambler-readout-output-" + i )
					.attr ( "class", "bombeui-controls-vertical-selector-output" )
				scramblerReadoutDiv.append ( "button" )
					.attr ( "id", "bombeui-controls-scrambler-readout-down-" + i )
					.attr ( "class", "bombeui-controls-vertical-selector-button" )
					.text ( "\u25BC" );
			}
		}

		/* Separator */
		this._testRegisterUI.append ( "span" ).classed ( "bombeui-controls-separator", true );

		/* ANIMATION SPEED SLIDER */
		{
			/* Add a label for the slider */
			this._testRegisterUI.append ( "p" )
				.attr ( "id", "bombeui-controls-animation-speed-text" )
				.attr ( "class", "bombeui-controls-text" )
				.text ( "Animation Speed" )

			/* Append the first slider indicator */
			this._testRegisterUI.append ( "span" )
				.attr ( "id", "bombeui-controls-animation-speed-output" )
				.attr ( "class", "bombeui-controls-vertical-slider-output" )

			/* Create the slider wrapper and slider */
			this._testRegisterUI
				.append ( "div" )
				.attr ( "class", "bombeui-controls-vertical-slider-wrapper" )
				.append ( "input" )
				.attr ( "type", "range" )
				.attr ( "id", "bombeui-controls-animation-speed-slider" )
				.attr ( "class", "bombeui-controls-vertical-slider" )
				.attr ( "orientation", "vertical" )
				.attr ( "min", 0 )
				.attr ( "max", BombeUI.ANIMATION_SPEED_MAX )
				.attr ( "step", 1 )
		}

		/* Separator */
		this._testRegisterUI.append ( "span" ).classed ( "bombeui-controls-separator", true );

		/* POWER ON/OFF BUTTON */
		{
			/* Append the power on/off button */
			this._testRegisterUI.append ( "button" )
				.attr ( "id", "bombeui-controls-power-button" )
				.attr ( "class", "bombeui-controls-button" )
				.text ( "Power On" );
		}

		/* Separator */
		this._testRegisterUI.append ( "span" ).classed ( "bombeui-controls-separator", true );

		/* SEARCH BUTTON */
		{
			/* Append the search button */
			this._testRegisterUI.append ( "button" )
				.attr ( "id", "bombeui-controls-search-button" )
				.attr ( "class", "bombeui-controls-button" )
				.text ( "Search" );
		}

		/* Separator */
		this._testRegisterUI.append ( "span" ).classed ( "bombeui-controls-separator", true );

		/* ADD DRUM BUTTON */
		{
			/* Append the add drum column button */
			this._testRegisterUI.append ( "button" )
				.attr ( "id", "bombeui-controls-add-drum-button" )
				.attr ( "class", "bombeui-controls-button" )
				.text ( "Insert Drum Column" );
		}

		/* Separator */
		this._testRegisterUI.append ( "span" ).classed ( "bombeui-controls-separator", true );



		/* DBOARD UI */

		/* Create the diagonal board UI */
		this._dboardUI = d3.create ( "template" );

		/* Separator */
		this._dboardUI.append ( "span" ).classed ( "bombeui-controls-separator", true );

		/* SHOW/HIDE DBOARD BUTTON */
		{
			/* Append the dboard enable/disable button */
			this._dboardUI.append ( "button" )
				.attr ( "id", "bombeui-controls-dboard-button" )
				.attr ( "class", "bombeui-controls-button" );

			/* Separator */
			this._dboardUI.append ( "span" ).classed ( "bombeui-controls-separator", true );
		}



		/* DRUM UI */

		/* Create the drum UI */
		this._drumUI = d3.create ( "template" );

		/* Separator */
		this._drumUI.append ( "span" ).classed ( "bombeui-controls-separator", true );

		/* SCRAMBLER SELECTORS */
		{
			/* Add a label for the scrambler selectors */
			this._drumUI.append ( "p" )
				.attr ( "class", "bombeui-controls-text" )
				.text ( "Rotors" )

			/* Create three selectors for the scramblers */
			for ( let i = 0; i < 3; ++i )
			{
				/* Create the wrapper */
				const drumUISelectorDiv = this._drumUI.append ( "div" )
					.attr ( "class", "bombeui-controls-vertical-selector-wrapper" );

				/* Add the elements */
				drumUISelectorDiv.append ( "button" )
					.attr ( "id", "bombeui-controls-scrambler-up-" + i )
					.attr ( "class", "bombeui-controls-vertical-selector-button" )
					.text ( "\u25B2" );
				drumUISelectorDiv.append ( "span" )
					.attr ( "id", "bombeui-controls-scrambler-output-" + i )
					.attr ( "class", "bombeui-controls-vertical-selector-output" )
				drumUISelectorDiv.append ( "button" )
					.attr ( "id", "bombeui-controls-scrambler-down-" + i )
					.attr ( "class", "bombeui-controls-vertical-selector-button" )
					.text ( "\u25BC" );
			}
		}

		/* Separator */
		this._drumUI.append ( "span" ).classed ( "bombeui-controls-separator", true );

		/* POSITIONS SELECTOR */
		{
			/* Add a label for the position selector */
			this._drumUI.append ( "p" )
				.attr ( "class", "bombeui-controls-text" )
				.text ( "Rotations" )

			/* Create three selectors for the scramblers */
			for ( let i = 0; i < 3; ++i )
			{
				/* Create the wrapper */
				const drumUISelectorDiv = this._drumUI.append ( "div" )
					.attr ( "class", "bombeui-controls-vertical-selector-wrapper" );

				/* Add the elements */
				drumUISelectorDiv.append ( "button" )
					.attr ( "id", "bombeui-controls-rotation-up-" + i )
					.attr ( "class", "bombeui-controls-vertical-selector-button" )
					.text ( "\u25B2" );
				drumUISelectorDiv.append ( "span" )
					.attr ( "id", "bombeui-controls-rotation-output-" + i )
					.attr ( "class", "bombeui-controls-vertical-selector-output" )
				drumUISelectorDiv.append ( "button" )
					.attr ( "id", "bombeui-controls-rotation-down-" + i )
					.attr ( "class", "bombeui-controls-vertical-selector-button" )
					.text ( "\u25BC" );
			}
		}

		/* Separator */
		this._drumUI.append ( "span" ).classed ( "bombeui-controls-separator", true );

		/* REFLECTOR SELECTOR */
		{
			/* Add a label for the reflector selector */
			this._drumUI.append ( "p" )
				.attr ( "class", "bombeui-controls-text" )
				.text ( "Reflector" )

			/* Create the wrapper */
			const drumUISelectorDiv = this._drumUI.append ( "div" )
				.attr ( "class", "bombeui-controls-vertical-selector-wrapper" );

			/* Add the elements */
			drumUISelectorDiv.append ( "button" )
				.attr ( "id", "bombeui-controls-reflector-up" )
				.attr ( "class", "bombeui-controls-vertical-selector-button" )
				.text ( "\u25B2" );
			drumUISelectorDiv.append ( "span" )
				.attr ( "id", "bombeui-controls-reflector-output" )
				.attr ( "class", "bombeui-controls-vertical-selector-output" )
			drumUISelectorDiv.append ( "button" )
				.attr ( "id", "bombeui-controls-reflector-down" )
				.attr ( "class", "bombeui-controls-vertical-selector-button" )
				.text ( "\u25BC" );
		}

		/* Separator */
		this._drumUI.append ( "span" ).classed ( "bombeui-controls-separator", true );

		/* CONNECTION SLIDERS */
		{
			/* Add a label for the connection sliders */
			this._drumUI.append ( "p" )
				.attr ( "class", "bombeui-controls-text" )
				.text ( "Drum Connections" )

			/* Append the first slider indicator */
			this._drumUI.append ( "span" )
				.attr ( "id", "bombeui-controls-drum-connected-to-output-left" )
				.attr ( "class", "bombeui-controls-vertical-slider-output-greek" )

			/* Create the slider wrapper */
			const drumUILeftSliderDiv = this._drumUI
				.append ( "div" )
				.attr ( "class", "bombeui-controls-vertical-slider-wrapper" );

			/* Create the first input */
			drumUILeftSliderDiv
				.append ( "input" )
				.attr ( "type", "range" )
				.attr ( "id", "bombeui-controls-drum-connected-to-left" )
				.attr ( "class", "bombeui-controls-vertical-slider" )
				.attr ( "orientation", "vertical" )
				.attr ( "min", 0 )
				.attr ( "max", this.alphabet.length - 1 )
				.attr ( "step", 1 )

			/* Create the second input */
			drumUILeftSliderDiv.clone ( true )
				.select ( "input" )
				.attr ( "id", "bombeui-controls-drum-connected-to-right" )
				.attr ( "class", "bombeui-controls-vertical-slider" )

			/* Append the second slider indicator */
			this._drumUI.append ( "span" )
				.attr ( "id", "bombeui-controls-drum-connected-to-output-right" )
				.attr ( "class", "bombeui-controls-vertical-slider-output-greek" )
		}

		/* Separator */
		this._drumUI.append ( "span" ).classed ( "bombeui-controls-separator", true );

		/* Delete DRUM BUTTON */
		{
			/* Append the delete drum column button */
			this._drumUI.append ( "button" )
				.attr ( "id", "bombeui-controls-delete-drum-button" )
				.attr ( "class", "bombeui-controls-button" )
				.text ( "Delete Drum Column" );
		}

		/* Separator */
		this._drumUI.append ( "span" ).classed ( "bombeui-controls-separator", true );

		/* ADD DRUM BUTTON */
		{
			/* Append the add drum column button */
			this._drumUI.append ( "button" )
				.attr ( "id", "bombeui-controls-add-drum-button" )
				.attr ( "class", "bombeui-controls-button" )
				.text ( "Insert Drum Column" );
		}

		/* Separator */
		this._drumUI.append ( "span" ).classed ( "bombeui-controls-separator", true );



		/* PLACEHOLDER UI */

		/* Create the UI */
		this._placeholderUI = d3.create ( "template" );

		/* Add text */
		this._placeholderUI.append ( "p" )
			.attr ( "class", "bombeui-controls-placeholder-text" )
			.html ( "Click on part of the circuit to configure its settings.<br><br>You can run the Bombe through the test register menu, which is opened by clicking on the far left of the circuit." );



		/* SET THE PLACEHOLDER UI AS THE DEFAULT */
		const controls = this._controlsAnchor;
		this._placeholderUI.selectAll ( function () { return this.childNodes; } ).each ( function ()
		{
			controls.node ().appendChild ( this.cloneNode ( true ) );
		} );
	}



	/**
	 * @name addDrumColumn
	 * @override
	 *
	 * @param {ScramblerCasing} scramblers	The scramblers the new column should use.
	 * @param {Array<Number>} connectedTo	An array of two integers specifying the indices of the columns.
	 * @param {Number} rotation	The initial rotation for the scramblers.
	 * @param {Number} [i = -1]	The index at which to insert the drum column. Use -1 for end insertion.
	 * to connect with a drum.
	 */
	addDrumColumn ( scramblers, connectedTo, rotation = 0, i = -1 )
	{
		/* Call the superclass method */
		super.addDrumColumn ( scramblers, connectedTo, rotation, i );

		/* If i == -1, set it to the last index. Then increment it. */
		if ( i === -1 ) i = this._plugColumns.length - 3;
		++i;

		/* Get a copy of the column and drum */
		const column = this._plugColumns [ i ];
		const drum = column.drum;

		/* Create a new overlay */
		const overlay = this._overlayAnchor
			.append ( "rect" )
			.classed ( "bombeui-overlay", true )
			.attr ( "rx", BombeUI.OVERLAY_ROUNDED_CORNERS );

		/* Add the overlay to the array */
		this._overlays.splice ( i, 0, overlay );

		/* Add the click handler */
		overlay.on ( "click", () => this._overlayClicked ( overlay, column ) );

		/* Inject a function to update the overlay's position into the column */
		const oldPositionColumn = column._positionColumn.bind ( column );
		column._positionColumn = function ( pos )
		{
			/* Call the original function */
			oldPositionColumn ( pos );

			/* Get the x and y positions */
			const x = this._truePos.x - this._actualColumnSeparation / 2;
			const y = this._truePos.y - this._actualCableSeparation / 2;

			/* Calculate the width and height */
			const width = this._plugColumnSpacing;
			const height = this._cableSpacing * this.alphabet.length;

			/* Also update the overlay */
			overlay
				.attr ( "x", x )
				.attr ( "y", y )
				.attr ( "width", width )
				.attr ( "height", height );
		};

		/* Replace the drum of the column with a proxy.
		 * This will force the drum settings to update when changes are made to the drum object.
		 */
		column._drum = new Proxy ( drum,
			{
				/* The setter for the proxy */
				set : ( obj, prop, value ) =>
				{
					/* Set the property */
					obj [ prop ] = value;

					/* Detect if the property needs to be intercepted */
					if ( BombeUI.DRUM_PROPERTIES_TO_WATCH.includes ( prop ) && this._selectedOverlay === overlay )
					{
						/* Update the scramblers and rotations */
						for ( let i = 0; i < 3; ++i )
						{
							/* Get the index of this scrambler */
							const scramblerIndex = this._defaultScramblers.findIndex ( x => x.sameMapping ( drum.scramblers.scramblers [ i ] ) );

							/* Throw if the index is negative */
							if ( scramblerIndex < 0 )
								throw new Error ( "BombeUI Drum Proxy: scrambler is not one of the defaults" );

							/* Update the scrambler name */
							this._controlsAnchor.select ( "#bombeui-controls-scrambler-output-" + i )
								.text ( BombeUI.ROMAN_NUMERALS [ scramblerIndex ] );

							/* Update the rotation output */
							this._controlsAnchor.select ( "#bombeui-controls-rotation-output-" + i )
								.text ( this.alphabet.toUpperCase () [ drum.rotations [ i ] ] );
						}

						/* Get the index of the reflector */
						const reflectorIndex = this._defaultReflectors.findIndex ( x => x.sameMapping ( drum.scramblers.scramblers [ 3 ] ) );

						/* Throw if the index is negative */
						if ( reflectorIndex < 0 )
							throw new Error ( "BombeUI Drum Proxy: reflector is not one of the defaults" );

						/* Update the reflector */
						this._controlsAnchor.select ( "#bombeui-controls-reflector-output" )
							.text ( reflectorIndex === 0 ? "B" : "C" );
					}

					/* Return */
					return true;
				}
			} );

		/* Replace connectedTo with a new method to update the sliders when changed */
		const connectedToDesc = Object.getOwnPropertyDescriptor ( column, "connectedTo" ) || Object.getOwnPropertyDescriptor ( DrumColumn.prototype, "connectedTo" );
		Object.defineProperty ( column, "connectedTo",
			{
				configurable: true,
				enumerable: true,
				get: () => connectedToDesc.get.call ( column ),
				set: connectedTo =>
				{
					/* Call the original function */
					connectedToDesc.set.call ( column, connectedTo );

					/* We are done if the menu for this drum is not showing */
					if ( this._selectedOverlay === overlay )
					{
						/* Update the connection output */
						this._controlsAnchor.selectAll ( "[id^=bombeui-controls-drum-connected-to-output]" )
							.data ( [ 0, 1 ] )
							.text ( i => this.steckerAlphabet [ connectedTo [ i ] ] );

						/* Update the connection sliders */
						this._controlsAnchor.selectAll ( "#bombeui-controls-drum-connected-to-left,#bombeui-controls-drum-connected-to-right" )
							.data ( [ 0, 1 ] )
							.property ( "value", i => connectedTo [ i ] );
					}
				}
			} );

		/* Update the position */
		column._positionColumn ( column.pos );
	}



	/**
	 * @name deleteDrumColumn
	 * @override
	 *
	 * @param {Number} [i = -1]	The index of the drum column to delete. Use -1 to remove the last drum.
	 */
	deleteDrumColumn ( i = -1 )
	{
		/* Delete the superclass */
		super.deleteDrumColumn ( i );

		/* Get the index of the overlay and the overlay */
		const index = ( i === -1 ? this._overlays.length - 2 : i + 1 );
		const overlay = this._overlays [ index ];

		/* Delete the overlay */
		this._overlays.splice( index, 1 ) [ 0 ].remove ();

		/* If the overlay is showing, click the overlay to the left,
		 * unless this is the far left most drum, then click the one to the right,
		 * unless this is the last drum, then deselect
		 */
		if ( overlay === this._selectedOverlay )
			if ( this._overlays.length > 2 )
				this._overlayClicked ( this._overlays [ index === 1 ? 1 : index - 1 ], this._plugColumns [ index === 1 ? 1 : index - 1 ] );
			else
				this._overlayClicked ( overlay, null );
	}



	/**
	 * @name deleteAllDrumColumns
	 * @override
	 */
	deleteAllDrumColumns ()
	{
		/* Call the superclass method */
		super.deleteAllDrumColumns ();

		/* Remove all drum column overlays */
		for ( let i = 1; i < this._overlays.length - 1; ++i )
			this._overlays [ i ].remove ();

		/* Splice the array */
		this._overlays.splice ( 1, this._overlays.length - 2 );

		/* If a drum column overlay is currently open, close it */
		if ( this._selectedOverlay && !this._overlays.includes ( this._selectedOverlay ) )
			this._overlayClicked ( this._selectedOverlay, null );
	}




	/**
	 * @name powerOn
	 * @override
	 *
	 * @param {Number} wire	The wire index in the text register to power on.
	 *
	 * @returns {Promise<void>} A promise which fulfils when the animation has ended.
	 */
	powerOn ( wire )
	{
		/* Open the test register menu, if it is not already open */
		if ( this._selectedOverlay !== this._overlays [ 0 ] )
			this._overlayClicked ( this._overlays [ 0 ], this._plugColumns [ 0 ] );

		/* Disable pointer events on the overlays */
		this._overlayAnchor.style ( "pointer-events", "none" );

		/* Hide the overlay */
		if ( this._selectedOverlay )
			this._selectedOverlay
				.transition ()
				.duration ( 100 )
				.ease ( d3.easeLinear )
				.style ( "opacity", 0 );

		/* Disable other pointer events */
		this._controlsAnchor.selectAll ( BombeUI.POWER_ANIMATION_TO_DISABLE )
			.style ( "pointer-events", "none" )
			.style ( "opacity", 0.5 );

		/* Set the power button's text */
		this._controlsAnchor.select ( "#bombeui-controls-power-button" )
			.text ( "Power Off" );

		/* Power the superclass */
		return super.powerOn ( wire );
	}



	/**
	 * @name powerOff
	 * @override
	 *
	 * @description Power off the currently powered on junction in the test register.
	 *
	 * @returns {Promise<void>} A promise which fulfils when the animation has ended.
	 */
	powerOff ()
	{
		/* Open the test register menu, if it is not already open */
		if ( this._selectedOverlay !== this._overlays [ 0 ] )
			this._overlayClicked ( this._overlays [ 0 ], this._plugColumns [ 0 ] );

		/* Disable the power button (until the poweroff finishes) */
		const powerButton = this._controlsAnchor.select ( "#bombeui-controls-power-button" )
			.style ( "pointer-events", "none" )
			.style ( "opacity", 0.5 );

		/* Power off, then enable pointer events */
		return super.powerOff ().finally ( () =>
		{
			/* Enable the overlays */
			this._overlayAnchor
				.style ( "pointer-events", "" )
				.style ( "opacity", "" );

			/* Enable the disabled buttons */
			this._controlsAnchor.selectAll ( BombeUI.POWER_ANIMATION_TO_DISABLE )
				.style ( "pointer-events", "" )
				.style ( "opacity", "" );

			/* Show the overlay */
			if ( this._selectedOverlay )
				this._selectedOverlay
					.transition ()
					.duration ( 100 )
					.ease ( d3.easeLinear )
					.style ( "opacity", 1 );

			/* Enable the power button and change its text */
			powerButton.style ( "pointer-events", "" ).style ( "opacity", "" )
				.text ( "Power On" );
		} );
	}



	/**
	 * @name forceOffAll
	 * @override
	 *
	 * @description Force off all animations.
	 *
	 * @returns {Promise<void>} A promise which fulfils when the bombe is powered off.
	 */
	forceOffAll ()
	{
		/* Open the test register menu, if it is not already open */
		if ( this._selectedOverlay !== this._overlays [ 0 ] )
			this._overlayClicked ( this._overlays [ 0 ], this._plugColumns [ 0 ] );

		/* Disable the power button (until the poweroff finishes) */
		const powerButton = this._controlsAnchor.select ( "#bombeui-controls-power-button" )
			.style ( "pointer-events", "none" )
			.style ( "opacity", 0.5 );

		/* Force off, then enable pointer events */
		return super.forceOffAll ().finally ( () =>
		{
			/* Enable the overlays */
			this._overlayAnchor
				.style ( "pointer-events", "" )
				.style ( "opacity", "" );

			/* Enable the disabled buttons */
			this._controlsAnchor.selectAll ( BombeUI.POWER_ANIMATION_TO_DISABLE )
				.style ( "pointer-events", "" )
				.style ( "opacity", "" );

			/* Show the overlay */
			if ( this._selectedOverlay )
				this._selectedOverlay
					.transition ()
					.duration ( 100 )
					.ease ( d3.easeLinear )
					.style ( "opacity", 1 );

			/* Enable the power button and change its text */
			powerButton.style ( "pointer-events", "" ).style ( "opacity", "" )
				.text ( "Power On" );
		} );
	}



	/**
	 * @name rotateAll
	 * @override
	 *
	 * @description Rotate all of the drums by a given amount.
	 * Note that this increases the reverse rotation, rather than the normal rotation.
	 */
	rotateAll ( rotation )
	{
		/* Rotate all in the superclass */
		super.rotateAll ( rotation );

		/* Set the scrambler readout */
		this.inverseScramblerReadout += rotation;
	}



	/**
	 * @name search
	 * @override
	 *
	 * @param {Number} wire	The wire to test in the test register.
	 * @param {Number} [combs = 0]	The number of combinations that have been searched through.
	 * @param {Number} [render = 1] The how many combinations to try before rendering. Increasing the value
	 * will speed up the search, although the page will become less responsive.
	 *
	 * @returns {Promise<Number>} A promise that resolves when a stop is found, or rejects when looping back to the start.
	 * The return is the number of iterations passed.
	 */
	search ( wire, combs = 0, render = 1 )
	{
		/* Open the test register menu, if it is not already open */
		if ( this._selectedOverlay !== this._overlays [ 0 ] )
			this._overlayClicked ( this._overlays [ 0 ], this._plugColumns [ 0 ] );

		/* Disable pointer events on the overlays */
		this._overlayAnchor.style ( "pointer-events", "none" );

		/* Disable other pointer events */
		const toDisable = this._controlsAnchor.selectAll ( BombeUI.SEARCH_TO_DISABLE )
			.style ( "pointer-events", "none" )
			.style ( "opacity", 0.5 );

		/* Hide the overlay */
		if ( this._selectedOverlay )
			this._selectedOverlay.transition ()
				.duration ( 100 )
				.ease ( d3.easeLinear )
				.style ( "opacity", 0 );

		/* Change the search button text */
		const searchButton = d3.select ( "#bombeui-controls-search-button" ).text ( "Cancel" );

		/* Begin the search */
		return super.search ( wire, combs, render ).finally ( () =>
		{
			/* Enable the overlays */
			this._overlayAnchor
				.style ( "pointer-events", "" )
				.style ( "opacity", "" );

			/* Enable the disabled buttons */
			toDisable
				.style ( "pointer-events", "" )
				.style ( "opacity", "" );

			/* Show the overlay */
			if ( this._selectedOverlay )
				this._selectedOverlay
					.transition ()
					.duration ( 100 )
					.ease ( d3.easeLinear )
					.style ( "opacity", 1 );

			/* Change the search button text */
			searchButton.text ( "Search" );
		} );
	}



	/**
	 * @name cancelSearch
	 * @override
	 *
	 * @returns {Promise<Number>|null} The current search, if any.
	 */
	cancelSearch ()
	{
		/* Open the test register menu, if it is not already open */
		if ( this._selectedOverlay !== this._overlays [ 0 ] )
			this._overlayClicked ( this._overlays [ 0 ], this._plugColumns [ 0 ] );

		/* Just cancel - pointer events etc. will be configures when the promise resolves */
		return super.cancelSearch ();
	}



	/**
	 * @name addDrumColumnsFromMenu
	 * @override
	 *
	 * @description Add new drum columns based on the provided menu.
	 *
	 * @param {BombeMenu} bombeMenu	The provided menu.
	 * @param {ScramblerCasing} scramblers	The scramblers for the column to use.
	 * @param {Array<Number>} [links = null]	An array of indices of links to include from the menu.
	 * All links are used if null is supplied, which is also the default.
	 */
	addDrumColumnsFromMenu ( bombeMenu, scramblers, links = null )
	{
		/* Call the superclass method */
		super.addDrumColumnsFromMenu ( bombeMenu, scramblers, links );

		/* Reset the scrambler readout */
		this.scramblerReadout = 0;
	}



	/** @public {Number} */
	get currentInput () { return this._currentInput; }
	set currentInput ( currentInput )
	{
		/* Throw if the current input is out of range */
		if ( currentInput < 0 || currentInput >= this.alphabet.length )
			throw new Error ( "BombeUI.currentInput: out of range" );

		/* Set the value */
		this._currentInput = currentInput;

		/* Set the output */
		if ( this._selectedOverlay === this._overlays [ 0 ] )
			this._controlsAnchor.select ( "#bombeui-controls-current-input-output" )
				.text ( this.alphabet.charAt ( this._currentInput ) );
	}



	/**
	 * @public {Boolean} dboard
	 * @override
	 */
	get dboard () { return super.dboard; }
	set dboard ( dboard )
	{
		/* Set in the superclass */
		super.dboard = dboard;

		/* Set the text of the diagonal board button */
		if ( this._selectedOverlay === this._overlays [ this._overlays.length - 1 ] )
			this._controlsAnchor.select ( "#bombeui-controls-dboard-button" )
				.text ( this.dboard ? "Disable Diagonal Board" : "Enable Diagonal Board" );
	}



	/**
	 * @public {Number} testRegisterIndex
	 * @override
	 */
	get testRegisterIndex () { return super.testRegisterIndex; }
	set testRegisterIndex ( testRegisterIndex )
	{
		/* Set in the superclass */
		super.testRegisterIndex = testRegisterIndex;

		/* Set the indicator to its correct value */
		if ( this._selectedOverlay === this._overlays [ 0 ] )
			this._controlsAnchor.select ( "#bombeui-controls-test-register-output" )
				.text ( this.steckerAlphabet.charAt ( this.testRegisterIndex ) );
	}



	/**
	 * @public {Number}
	 * @override
	 */
	get animationSpeed () { return super.animationSpeed; }
	set animationSpeed ( animationSpeed )
	{
		/* Set in the superclass */
		super.animationSpeed = animationSpeed;
		
		/* Modify the UI if the appropriate overlay is open */
		if ( this._selectedOverlay === this._overlays [ 0 ] )
		{
			/* Set the slider value */
			this._controlsAnchor.select ( "#bombeui-controls-animation-speed-slider" )
				.property ( "value", BombeUI.ANIMATION_SPEED_MAX - this.animationSpeed );

			/* Set the output */
			this._controlsAnchor.select ( "#bombeui-controls-animation-speed-output" )
				.text ( this.animationSpeed );
		}
	}



	/**
	 * @public {Number}
	 * @override
	 */
	get scramblerReadout ()
	{
		return this._scramblerReadouts [ 2 ]
			+ this._scramblerReadouts [ 1 ] * this.alphabet.length
			+ this._scramblerReadouts [ 0 ] * this.alphabet.length * this.alphabet.length;
	}
	set scramblerReadout ( scramblerReadout )
	{
		/* Set the new readout */
		this.scramblerReadouts = [
			Scrambler.nonNegativeMod ( scramblerReadout / this.alphabet.length ** 2, this.alphabet.length ),
			Scrambler.nonNegativeMod ( scramblerReadout / this.alphabet.length ** 1, this.alphabet.length ),
			Scrambler.nonNegativeMod ( scramblerReadout / this.alphabet.length ** 0, this.alphabet.length )
		];
	}



	/**
	 * @public {Number}
	 * @override
	 */
	get inverseScramblerReadout ()
	{
		return this._scramblerReadouts [ 0 ]
			+ this._scramblerReadouts [ 1 ] * this.alphabet.length
			+ this._scramblerReadouts [ 2 ] * this.alphabet.length * this.alphabet.length;
	}
	set inverseScramblerReadout ( inverseScramblerReadout )
	{
		/* Set the new readout */
		this.scramblerReadouts = [
			Scrambler.nonNegativeMod ( inverseScramblerReadout / this.alphabet.length ** 0, this.alphabet.length ),
			Scrambler.nonNegativeMod ( inverseScramblerReadout / this.alphabet.length ** 1, this.alphabet.length ),
			Scrambler.nonNegativeMod ( inverseScramblerReadout / this.alphabet.length ** 2, this.alphabet.length )
		];
	}



	/**
	 * @public {Numbers[]}
	 * @override
	 */
	get scramblerReadouts () { return this._scramblerReadouts.slice ();	}
	set scramblerReadouts ( scramblerReadouts )
	{
		/* Set the new readouts */
		this._scramblerReadouts = scramblerReadouts.map ( e => Scrambler.nonNegativeMod ( e, this.alphabet.length ) );

		/* Modify the UI if the appropriate overlay is open */
		if ( this._selectedOverlay === this._overlays [ 0 ] )
		{
			/* Set the output */
			this._controlsAnchor.selectAll ( "[id^=bombeui-controls-scrambler-readout-output]" )
				.data ( [ 0, 1, 2 ] )
				.text ( i => this.alphabet.toUpperCase ().charAt ( this._scramblerReadouts [ i ] ) );
		}
	}



	/**
	 * @name _overlayClicked
	 * @private
	 *
	 * @param overlay	The overlay just clicked.
	 * @param {TestRegisterColumn|DrumColumn|DBoardColumn} column	The column just clicked.
	 */
	_overlayClicked ( overlay, column )
	{
		/* Unselect the currently selected overlay */
		if ( this._selectedOverlay )
			this._selectedOverlay
				.classed ( "bombeui-overlay-selected", false );

		/* Clear the current controls */
		this._controlsAnchor.selectAll ( "*" ).remove ();

		/* Switch depending on whether we are opening a new menu, or closing the current one */
		if ( this._selectedOverlay === overlay )
		{
			/* Set the selected overlay to null */
			this._selectedOverlay = null;

			/* Add the placeholder UI */
			const controls = this._controlsAnchor;
			this._placeholderUI.selectAll ( function () { return this.childNodes; } ).each ( function ()
			{
				controls.node ().appendChild ( this.cloneNode ( true ) );
			} );
		} else
		{
			/* Show the new overlay */
			this._selectedOverlay = overlay
				.classed ( "bombeui-overlay-selected", true );

			/* Clear the current controls */
			this._controlsAnchor.select ( "*" ).remove ();

			/* Switch depending on the column */
			const controls = this._controlsAnchor;
			if ( column instanceof DBoardColumn )
			{
				/* Add the controls */
				this._dboardUI.selectAll ( function () { return this.childNodes; } ).each ( function ()
				{
					controls.node ().appendChild ( this.cloneNode ( true ) );
				} );



				/* SHOW/HIDE DBOARD BUTTON */
				{
					/* Set the button callback and text */
					this._controlsAnchor.select ( "#bombeui-controls-dboard-button" )
						.on ( "click", () => this.dboard = !this.dboard )
						.text ( this.dboard ? "Disable Diagonal Board" : "Enable Diagonal Board" );
				}
			} else
			if ( column instanceof TestRegisterColumn )
			{
				/* Add the controls */
				this._testRegisterUI.selectAll ( function () { return this.childNodes; } ).each ( function ()
				{
					controls.node ().appendChild ( this.cloneNode ( true ) );
				} );



				/* TEST REGISTER SELECTOR */
				{
					/* Get handles on the test register selector components */
					const testRegisterSelectorUp = this._controlsAnchor.select ( "#bombeui-controls-test-register-up" );
					const testRegisterSelectorOutput = this._controlsAnchor.select ( "#bombeui-controls-test-register-output" );
					const testRegisterSelectorDown = this._controlsAnchor.select ( "#bombeui-controls-test-register-down" );

					/* Set the up callback */
					testRegisterSelectorUp.on ( "click", () =>
						this.testRegisterIndex = ( this.testRegisterIndex + 1 ) % this.alphabet.length )

					/* Set the down callback */
					testRegisterSelectorDown.on ( "click", () =>
						this.testRegisterIndex = ( this.testRegisterIndex - 1 + this.alphabet.length ) % this.alphabet.length );

					/* Set the output */
					testRegisterSelectorOutput
						.text ( this.steckerAlphabet.charAt ( this.testRegisterIndex ) );
				}



				/* CURRENT INPUT SELECTOR */
				{
					/* Get handles on the current input selector components */
					const currentInputSelectorUp = this._controlsAnchor.select ( "#bombeui-controls-current-input-up" );
					const currentInputSelectorOutput = this._controlsAnchor.select ( "#bombeui-controls-current-input-output" );
					const currentInputSelectorDown = this._controlsAnchor.select ( "#bombeui-controls-current-input-down" );

					/* Set the up callback */
					currentInputSelectorUp.on ( "click", () =>
						this.currentInput = ( this._currentInput + 1 ) % this.alphabet.length )

					/* Set the down callback */
					currentInputSelectorDown.on ( "click", () =>
						this.currentInput = ( this._currentInput - 1 + this.alphabet.length ) % this.alphabet.length );

					/* Set the indicator to its correct value */
					currentInputSelectorOutput.text ( this.alphabet.charAt ( this.currentInput ) );
				}



				/* ROTATE ALL BUTTONS */
				{
					/* Set the callbacks */
					this._controlsAnchor.select ( "#bombeui-controls-rotate-all-up" ).on ( "click", () => this.rotateAll ( 1 ) );
					this._controlsAnchor.select ( "#bombeui-controls-rotate-all-down" ).on ( "click", () => this.rotateAll ( -1 ) );
				}



				/* SCRAMBLER READOUT */
				{
					/* Get handles on the selector components */
					const scramblerReadoutsUp = this._controlsAnchor.selectAll ( "[id^=bombeui-controls-scrambler-readout-up]" );
					const scramblerReadoutsOutput = this._controlsAnchor.selectAll ( "[id^=bombeui-controls-scrambler-readout-output]" );
					const scramblerReadoutsDown = this._controlsAnchor.selectAll ( "[id^=bombeui-controls-scrambler-readout-down]" );

					/* Create the callback */
					let scramblerReadoutsCallback = ( i, dir ) =>
						this.scramblerReadouts = this.scramblerReadouts.map ( ( e, j ) => i === j ? e + dir : e );

					/* Set the callbacks */
					scramblerReadoutsUp.data ( [ 0, 1, 2 ] ).on ( "click", ( e, i ) => scramblerReadoutsCallback ( i, 1 ) );
					scramblerReadoutsDown.data ( [ 0, 1, 2 ] ).on ( "click", ( e, i ) => scramblerReadoutsCallback ( i, -1 ) );

					/* Set the indicators to their correct values */
					scramblerReadoutsOutput.data ( [ 0, 1, 2 ] ).text ( i =>
						this.alphabet.toUpperCase ().charAt ( this.scramblerReadouts [ i ] ) );
				}



				/* ANIMATION SPEED SLIDER */
				{
					/* Add the slider output callback */
					const sliderOutput = this._controlsAnchor.select ( "#bombeui-controls-animation-speed-output" );
					const slider = this._controlsAnchor.select ( "#bombeui-controls-animation-speed-slider" ).on ( "input", () =>
						sliderOutput.text ( BombeUI.ANIMATION_SPEED_MAX - parseFloat ( slider.property ( "value" ) ) ) );

					/* Add the change callback */
					slider.on ( "change", () =>
						this.animationSpeed = BombeUI.ANIMATION_SPEED_MAX - parseFloat ( slider.property ( "value" ) ) );

					/* Change the slider's value and label */
					slider.property ( "value", BombeUI.ANIMATION_SPEED_MAX - this.animationSpeed );
					sliderOutput.text ( this.animationSpeed );
				}



				/* POWER ON */
				{
					/* Set the power callback */
					const powerButton = this._controlsAnchor.select ( "#bombeui-controls-power-button" )
						.on ( "click", () =>
						{
							/* If the bombe is currently powered on, then power off. Otherwise, power on. */
							if ( this._activeAnimation )
								this.powerOff ()
							else
								this.powerOn ( this._currentInput );
						} );
				}



				/* SEARCH BUTTON */
				{
					/* Set the callback */
					const searchButton = this._controlsAnchor.select ( "#bombeui-controls-search-button" )
						.on ( "click", () =>
						{
							/* Start or cancel a search */
							if ( this._activeSearch )
								this.cancelSearch ()
							else
								this.search ( this.currentInput, 0, this.alphabet.length + 1 )
						} );
				}



				/* ADD DRUM BUTTON */
				{
					/* Set the add drum callback */
					const addDrumButton = this._controlsAnchor.select ( "#bombeui-controls-add-drum-button" ).on ( "click", () =>
					{
						/* Add the new column */
						this.addDrumColumn ( this._defaultScramblerCasing, [ 0, 1 ], null, 0 );

						/* Select the column */
						this._overlayClicked ( this._overlays [ 1 ], this._plugColumns [ 1 ] );
					} );
				}

			} else
			if ( column instanceof DrumColumn )
			{
				/* Add the controls */
				this._drumUI.selectAll ( function () { return this.childNodes; } ).each ( function ()
				{
					controls.node ().appendChild ( this.cloneNode ( true ) );
				} );



				/* SCRAMBLER SELECTORS */
				{
					/* Get handles on the scrambler selector components */
					const scramblerSelectorsUp = this._controlsAnchor.selectAll ( "[id^=bombeui-controls-scrambler-up]" );
					const scramblerSelectorsOutput = this._controlsAnchor.selectAll ( "[id^=bombeui-controls-scrambler-output]" );
					const scramblerSelectorsDown = this._controlsAnchor.selectAll ( "[id^=bombeui-controls-scrambler-down]" );

					/* Create the callback */
					let scramblersCallback = ( i, dir ) =>
					{
						/* Get the current scrambler index */
						let index = this._defaultScramblers.findIndex ( x => x.sameMapping ( column.drum.scramblers.scramblers [ i ] ) );
						index = ( index + dir + this._defaultScramblers.length ) % this._defaultScramblers.length;

						/* Update the actual scrambler */
						column.drum.scramblers = new ScramblerCasing (
							column.drum.scramblers.scramblers.map ( ( e, j ) => i === j ? this._defaultScramblers [ index ].clone () : e ) );
					}

					/* Set the callbacks */
					scramblerSelectorsUp.data ( [ 0, 1, 2 ] ).on ( "click", ( e, i ) => scramblersCallback ( i, 1 ) );
					scramblerSelectorsDown.data ( [ 0, 1, 2 ] ).on ( "click", ( e, i ) => scramblersCallback ( i, -1 ) );

					/* Set the indicators to their correct values */
					scramblerSelectorsOutput.data ( [ 0, 1, 2 ] ).text ( i =>
						BombeUI.ROMAN_NUMERALS [ this._defaultScramblers.findIndex ( x => x.sameMapping ( column.drum.scramblers.scramblers [ i ] ) ) ] );
				}



				/* ROTATION SELECTORS */
				{
					/* Get handles on the scrambler selector components */
					const rotationSelectorsUp = this._controlsAnchor.selectAll ( "[id^=bombeui-controls-rotation-up]" );
					const rotationSelectorsOutput = this._controlsAnchor.selectAll ( "[id^=bombeui-controls-rotation-output]" );
					const rotationSelectorsDown = this._controlsAnchor.selectAll ( "[id^=bombeui-controls-rotation-down]" );

					/* Create the callback */
					let rotationsCallback = ( i, dir ) =>
						column.drum.rotations = column.drum.rotations.map ( ( e, j ) => i === j ? e + dir : e );

					/* Set the callbacks */
					rotationSelectorsUp.data ( [ 0, 1, 2 ] ).on ( "click", ( e, i ) => rotationsCallback ( i, 1 ) );
					rotationSelectorsDown.data ( [ 0, 1, 2 ] ).on ( "click", ( e, i ) => rotationsCallback ( i, -1 ) );

					/* Set the indicators to their correct values */
					rotationSelectorsOutput.data ( [ 0, 1, 2 ] ).text ( i =>
						this.alphabet.toUpperCase ().charAt ( column.drum.rotations [ i ] ) );
				}



				/* REFLECTOR SELECTOR */
				{
					/* Get handles on the reflector selector components */
					const reflectorSelectorUpAndDown = this._controlsAnchor.selectAll ( "#bombeui-controls-reflector-up,#bombeui-controls-reflector-down" );
					const reflectorSelectorOutput = this._controlsAnchor.select ( "#bombeui-controls-reflector-output" );

					/* Set the up callbacks (the up and down callbacks do the same thing */
					reflectorSelectorUpAndDown.on ( "click", () =>
					{
						/* Get the current reflector index */
						let index = this._defaultReflectors.findIndex ( x => x.sameMapping ( column.drum.scramblers.scramblers [ 3 ] ) );
						index = ( index + 1 ) % this._defaultReflectors.length;

						/* Update the actual scrambler */
						column.drum.scramblers = new ScramblerCasing (
							column.drum.scramblers.scramblers.map ( ( e, i ) => i === 3 ? this._defaultReflectors [ index ].clone () : e ) );
					} );

					/* Set the indicator to its correct value */
					reflectorSelectorOutput.text ( this._defaultReflectors.findIndex ( x => x.sameMapping ( column.drum.scramblers.scramblers [ 3 ] ) ) ? "C" : "B" );
				}



				/* CONNECTION SLIDERS */
				{
					/* Add the slider output callbacks */
					const leftSliderOutput = this._controlsAnchor.select ( "#bombeui-controls-drum-connected-to-output-left" );
					const rightSliderOutput = this._controlsAnchor.select ( "#bombeui-controls-drum-connected-to-output-right" );
					const leftSlider = this._controlsAnchor.select ( "#bombeui-controls-drum-connected-to-left" ).on ( "input", () =>
						leftSliderOutput.text ( this.steckerAlphabet.charAt ( parseInt ( leftSlider.property ( "value" ) ) ) ) );
					const rightSlider = this._controlsAnchor.select ( "#bombeui-controls-drum-connected-to-right" ).on ( "input", () =>
						rightSliderOutput.text ( this.steckerAlphabet.charAt ( parseInt ( rightSlider.property ( "value" ) ) ) ) );

					/* Create the callback */
					const sliderCallback = ( leftChanged ) =>
					{
						/* Get the value of the sliders */
						let leftValue = parseInt ( leftSlider.property ( "value" ) );
						let rightValue = parseInt ( rightSlider.property ( "value" ) );

						/* If the value is the same as the other connection, move the slider forwards one, or alternatively backwards one */
						if ( leftValue === rightValue )
							if ( leftChanged )
								leftSlider.property ( "value", ++leftValue !== this.alphabet.length ? leftValue : leftValue -= 2 );
							else
								rightSlider.property ( "value", ++rightValue !== this.alphabet.length ? rightValue : rightValue -= 2 );

						/* Set the connection */
						column.connectedTo = [ leftValue, rightValue ];
					}

					/* Add the setting callbacks */
					leftSlider.on ( "change", () => sliderCallback ( true ) );
					rightSlider.on ( "change", () => sliderCallback ( false ) );

					/* Change the sliders' values and labals */
					leftSlider.property ( "value", column.connectedTo [ 0 ] );
					rightSlider.property ( "value", column.connectedTo [ 1 ] );
					leftSliderOutput.text ( this.steckerAlphabet.charAt ( column.connectedTo [ 0 ] ) );
					rightSliderOutput.text ( this.steckerAlphabet.charAt ( column.connectedTo [ 1 ] ) );
				}



				/* DELETE DRUM BUTTON */
				{
					/* Set the delete drum callback */
					const deleteDrumButton = this._controlsAnchor.select ( "#bombeui-controls-delete-drum-button" ).on ( "click", () =>
						this.deleteDrumColumn ( this._plugColumns.indexOf ( column ) - 1 ) );
				}



				/* ADD DRUM BUTTON */
				{
					/* Set the add drum callback */
					const addDrumButton = this._controlsAnchor.select ( "#bombeui-controls-add-drum-button" ).on ( "click", () =>
					{
						/* Get the index of the column and the overlay */
						const index = this._plugColumns.indexOf ( column );

						/* Add the colum with the same scramblers */
						this.addDrumColumn ( column.drum.scramblers, column.connectedTo, null, index );

						/* Select the column */
						this._overlayClicked ( this._overlays [ index + 1 ], this._plugColumns [ index + 1 ] );
					} );
				}
			}
		}
	}



	/**
	 * @name deselectOverlay
	 *
	 * @description If any overlay is eelected, deselect it.
	 */
	deselectOverlay ()
	{
		if ( this._selectedOverlay )
			this._overlayClicked ( this._selectedOverlay, null );
	}



	/**
	 * @name destroy
	 * @override
	 *
	 * @description Destroy the bombe.
	 */
	destroy ()
	{
		/* Clear the menu */
		this._controlsAnchor.selectAll ( "*" ).remove ();

		/* Remove all overlays */
		for ( const overlay of this._overlays )
			overlay.remove ();
		
		/* Destroy the superclass */
		super.destroy ();
	}

}