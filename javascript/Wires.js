/**
 * class Junction
 *
 * @description Represents a node in the lowest-level wiring of the Bombe.
 * Connects to any number of wires.
 */
class Junction
{
	/** @private */
	_anchor;

	/** @private SVG Circle positioned at the junction */
	_svgCircle;

	/** @private {Boolean} Whether the Junction is powered */
	_powered;

	/** @private {Vec} The position of the wire */
	_pos;

	/** @private {Styles} The styles of the wire */
	_styles;



	/** @private {Set<Wire>} */
	_incoming = new Set ();

	/** @private {Set<Wire>} */
	_outgoing = new Set ();



	/**
	 * @name constructor
	 *
	 * @param anchor	The D3 selection to append the junction to.
	 * @param {Vec} pos	The position of the junction.
	 * @param {Styles} styles	The styles of the junction.
	 */
	constructor ( anchor, pos, styles )
	{
		/* Save the anchor */
		this._anchor = anchor;

		/* Create the circle */
		this._svgCircle = this._anchor.append ( "circle" );

		/* Initially, the wire is dead */
		this._powered = false;

		/* Set the position and the style */
		this.pos = pos;
		this.styles = styles;

		/* Set the circles to have no stroke */
		this._svgCircle.attr ( "stroke-width", "0" );
	}



	/** @public {Styles} */
	get styles () { return this._styles; }
	set styles ( styles )
	{
		/* Save the new styles */
		this._styles = styles;

		/* Change the styles depending on whether the junction is alive */
		if ( this._powered ) this._svgCircle
			.attr ( "r", this._styles.liveWidth )
			.attr ( "fill", this._styles.liveColor )
			.attr ( "fill-opacity", this._styles.liveOpacity );
		else this._svgCircle
			.attr ( "r", this._styles.deadWidth )
			.attr ( "fill", this._styles.deadColor )
			.attr ( "fill-opacity", this._styles.deadOpacity );
	}



	/** @public {Vec} */
	get pos () { return this._pos; }
	set pos ( pos )
	{
		/* Save the new position */
		this._pos = pos;

		/* Position the circle */
		this._svgCircle
			.attr ( "cx", this._pos.x )
			.attr ( "cy", this._pos.y );

		/* Update the position of each of the connecting wires */
		for ( const wire of this._outgoing ) wire._updateOutofPosition ();
		for ( const wire of this._incoming ) wire._updateIntoPosition ();
	}



	/**
	 * @public {Set<Wire>} An iterator over incoming wires.
	 * @readonly
	 */
	get incoming () { return Object.freeze ( new Set ( this._incoming ) ); }

	/**
	 * @public {Set<Wire>} An iterator over outgoing wires.
	 * @readonly
	 */
	get outgoing () { return Object.freeze ( new Set ( this._outgoing ) ); }



	/**
	 * @name powerOn
	 *
	 * @description Power the junction on, propagating through all directly connected wires,
	 * until the entire wire-junction network is powered on.
	 *
	 * If the junction is already powered on, a resolved promise is returned immediately.
	 *
	 * @returns {Promise<void>} A promise which only resolved when all _reachable_ Wires and junction are live.
	 */
	powerOn ()
	{
		/* If is powered on already, return immediately */
		if ( this._powered )
			return Promise.resolve ();

		/* Mark as powered on */
		this._powered = true;

		/* Create an array of promises to wait for */
		const promises = [];

		/* Animate the circle to a powered-on state */
		promises.push ( this._svgCircle
			.transition ()
			.duration ( 50 )
			.attr ( "r", this._styles.liveWidth )
			.attr ( "fill", this._styles.liveColor )
			.attr ( "fill-opacity", this._styles.liveOpacity )
			.end () );

		/* Animate all connecting wires */
		for ( const wire of this._outgoing ) promises.push ( wire.animateOnForward () );
		for ( const wire of this._incoming ) promises.push ( wire.animateOnReverse () );

		/* Return the intersection of all promises */
		return Promise.all ( promises );
	}



	/**
	 * @name isPoweredOn
	 *
	 * @returns {Boolean} True iff the junction is powered on.
	 */
	isPoweredOn ()
	{
		return this._powered;
	}



	/**
	 * @name powerOff
	 *
	 * @description Power the junction off, propagating through all directly connected wires,
	 * until the entire wire-junction network is powered off.
	 *
	 * @returns {Promise<void>}
	 */
	powerOff ()
	{
		/* If the junction is unpowered, resolve */
		if ( !this._powered )
			return Promise.resolve ();

		/* Mark as unpowered */
		this._powered = false;

		/* Create an array of promises to wait for */
		const promises = [];

		/* Animate the circle to a powered-off state */
		promises.push ( this._svgCircle
			.transition ()
			.duration ( 50 )
			.attr ( "r", this._styles.deadWidth )
			.attr ( "fill", this._styles.deadColor )
			.attr ( "fill-opacity", this._styles.deadOpacity )
			.end () );

		/* Animate all connecting wires */
		for ( const wire of this._outgoing ) promises.push ( wire.animateOffForward () );
		for ( const wire of this._incoming ) promises.push ( wire.animateOffReverse () );

		/* Return the intersection of all promises */
		return Promise.all ( promises );
	}



	/**
	 * @name forceOff
	 *
	 * @description Set the junction to be powered off, including making any required visual changes, without animation
	 * or propagation.
	 */
	forceOff ()
	{
		/* Set as powered off */
		this._powered = false;

		/* Recolor the circle */
		this._svgCircle
			.attr ( "r", this._styles.deadWidth )
			.attr ( "fill", this._styles.deadColor )
			.attr ( "fill-opacity", this._styles.deadOpacity );
	}



	/**
	 * @name connectedSet
	 *
	 * @description Get the set of connected junctions including this junction
	 *
	 * @return {Set<Junction>} The set of junctions connected to this one
	 */
	connectedSet ()
	{
		/* Create a set of junctions that are connected, and a queue of those that are next to visit */
		const connected = new Set ( [ this ] );
		const toVisit = [ this ];

		/* Iterate while toVisit is non-empty */
		while ( toVisit.length !== 0 )
		{
			/* Pop the next junction to visit */
			const next = toVisit.pop ();

			/* Iterate through all outgoing and incoming wires.
			 * If any junction at the other end has not yet been visited,
			 * enqueue that junction.
			 */
			for ( const wire of next._outgoing )
				if ( !connected.has ( wire._into ) )
				{
					connected.add ( wire._into );
					toVisit.push ( wire._into );
				}
			for ( const wire of next._incoming )
				if ( !connected.has ( wire._outof ) )
				{
					connected.add ( wire._outof );
					toVisit.push ( wire._outof );
				}
		}

		/* Return the set */
		return connected;
	}



	/**
	 * @name cloneWithoutConnections
	 *
	 * @returns {Junction} A new junction with the same styles and position as this junction,
	 * but without any connections to wires.
	 */
	cloneWithoutConnections ()
	{
		/* Return a new junction */
		return new Junction ( this._anchor, this._pos, this._styles );
	}



	/**
	 * @name absorb
	 *
	 * @description Takes another junction and inherits all of its connected wires.
	 * The other junction is then destroyed.
	 *
	 * @param {Junction} junction	The junction to absorb.
	 *
	 * @returns {Junction} Returns this junction.
	 */
	absorb ( junction )
	{
		/* Ignore if junction is this */
		if ( this === junction )
			return this;
		
		/* Add all the junction's connected wires to this one */
		for ( const wire of junction._incoming )
			wire.into = this;
		for ( const wire of junction._outgoing )
			wire.outof = this;

		/* Destroy the other junction and return this */
		junction.destroy ();
		return this;
	}



	/**
	 * @name destroy
	 *
	 * @description Destroy the junction, including the SVG elements it manages.
	 */
	destroy ()
	{
		/* Delete the circle */
		this._svgCircle.remove ();
	}

}



/**
 * @class Wire
 *
 * @description Represents an edge in the lowest-level wiring of the Bombe.
 * Connects to exactly two junctions.
 */
class Wire
{
	/** @private */
	_liveAnchor;

	/** @private */
	_deadAnchor;


	/** @private SVG Line for animating the wire forwards */
	_svgForwardLive;

	/** @private SVG Line for animating the wire backwards */
	_svgReverseLive;

	/** @private SVG Line for the dead section of the wire */
	_svgDead;



	/** @private {Number} */
	_animationSpeed;

	/** @private {Styles} */
	_styles;




	/** @private {Junction|null} */
	_outof = null;

	/** @private {Junction|null} */
	_into = null;



	/** @public {Number} */
	static POWER_OFF_ANIMATION_SPEED = 5000;



	/**
	 * @name constructor
	 *
	 * @param liveAnchor	The D3 selection to append live parts of the wire to.
	 * @param deadAnchor	The D3 selection to append dead parts of the wire to.
	 * @param {Junction|null} outof	The junction, that the wire comes out of.
	 * @param {Junction|null} into	The junction, that the wire goes in to.
	 * @param {Number|null} animationSpeed	The speed of the animation.
	 * @param {Styles} styles	The styles of the wire.
	 */
	constructor ( liveAnchor, deadAnchor, outof, into, animationSpeed, styles )
	{
		/* Save the anchors */
		this._liveAnchor = liveAnchor;
		this._deadAnchor = deadAnchor;

		/* Create the wire elements */
		this._svgDead = this._deadAnchor.append ( "line" );
		this._svgForwardLive = this._liveAnchor.append ( "line" );
		this._svgReverseLive = this._liveAnchor.append ( "line" );

		/* Set outof and into */
		this.outof = outof;
		this.into = into;

		/* Set the styles and animation speed */
		this.styles = styles;
		this.animationSpeed = animationSpeed;

		/* Set the wires to have rounded edges */
		this._svgForwardLive.attr ( "stroke-linecap", "round" );
		this._svgReverseLive.attr ( "stroke-linecap", "round" );
		this._svgDead.attr ( "stroke-linecap", "round" );

		/* Set the live lines to be invisible */
		this._svgForwardLive.attr ( "visibility", "hidden" );
		this._svgReverseLive.attr ( "visibility", "hidden" );
	}



	/** @public {Junction|null} */
	get outof () { return this._outof; }
	set outof ( outof )
	{
		/* We need to configure the current wire if _outof is being changed */
		if ( this._outof !== outof )
		{
			/* If the current junction is not null, then delete this wire from the current junction */
			if ( this._outof )
				this._outof._outgoing.delete ( this );

			/* Copy over the new junction */
			this._outof = outof;

			/* If the new junction is not null, then add the wire to the new junction */
			if ( this._outof )
				this._outof._outgoing.add ( this );
		}

		/*  If the new junction is null, return */
		if ( !this._outof ) return;

		/* Update the line positions */
		this._updateOutofPosition ();
	}

	/** @public {Junction|null} */
	get into () { return this._into; }
	set into ( into )
	{
		/* We need to configure the current wire if _into is being changed */
		if ( this._into !== into )
		{
			/* If the current junction is not null, then delete this wire from the current junction */
			if ( this._into )
				this._into._incoming.delete ( this );

			/* Copy over the new junction */
			this._into = into;

			/* If the new junction is not null, then add the wire to the new junction */
			if ( this._into )
				this._into._incoming.add ( this );
		}

		/*  If the new junction is null, return */
		if ( !this._into ) return;

		/* Update the line positions */
		this._updateIntoPosition ();
	}



	/** @public {Number|null} */
	get animationSpeed () { return this._animationSpeed; }
	set animationSpeed ( animationSpeed )
	{
		/* Set the new animation speed */
		this._animationSpeed = animationSpeed;

		/* Interrupt any current animations */
		this._svgForwardLive.interrupt ();
		this._svgReverseLive.interrupt ();
	}



	/** @public {Styles} */
	get styles () { return this._styles; }
	set styles ( styles )
	{
		/* Save the styles */
		this._styles = styles;

		/* Update the live styles */
		this._svgForwardLive
			.attr ( "stroke-width", this._styles.liveWidth )
			.attr ( "stroke", this._styles.liveColor )
			.attr ( "stroke-opacity", this._styles.liveOpacity );
		this._svgReverseLive
			.attr ( "stroke-width", this._styles.liveWidth )
			.attr ( "stroke", this._styles.liveColor )
			.attr ( "stroke-opacity", this._styles.liveOpacity );

		/* Update the dead styles */
		this._svgDead
			.attr ( "stroke-width", this._styles.deadWidth )
			.attr ( "stroke", this._styles.deadColor )
			.attr ( "stroke-opacity", this._styles.deadOpacity );
	}



	/**
	 * @name disconnectOutof
	 *
	 * @returns {Junction} The new outof junction, which is a clone of the current outof junction, but with
	 * only this wire connected to it.
	 */
	disconnectOutof ()
	{
		this.outof = this._outof.cloneWithoutConnections ();
		return this._outof;
	}



	/**
	 * @name disconnectInto
	 *
	 * @returns {Junction} The new into junction, which is a clone of the current into junction, but with
	 * only this wire connected to it.
	 */
	disconnectInto ()
	{
		this.into = this._into.cloneWithoutConnections ();
		return this._into;
	}



	/**
	 * @name animateOnForward
	 *
	 * @description Animate the wire in the forward direction. When complete, automatically call
	 * {@link Junction.powerOn}() on {@link into}.
	 *
	 * @returns {Promise<void>} The same promise produced by calling {@link Junction.powerOn}() on {@link into}.
	 */
	animateOnForward ()
	{
		/* If the animation speed is null, reject */
		if ( this._animationSpeed === null )
			return Promise.reject ();

		/* If the wire is fully live, power on the next junction immediately */
		if ( this._fullyLive )
			return this._into.powerOn ();

		/* If the speed is Infinity, we don't want to perform any animation */
		if ( this._animationSpeed === Infinity )
		{
			/* Set the wire to be live */
			this._svgForwardLive
				.attr ( "x2", this._into._pos.x )
				.attr ( "y2", this._into._pos.y )
				.attr ( "visibility", "visible" );

			/* Power on the next junction */
			return this._into.powerOn ();
		}

		/* Calculate the animation duration */
		const duration = ( ( 1 - this._forwardAnimationFrac ) * this._wireLength ) / this._animationSpeed;

		/* Start the animation. Catch any interrupts by restarting the animation.
		 * When complete, power on the next junction.
		 */
		return this._svgForwardLive
			.attr ( "visibility", "visible" )
			.transition ()
			.ease ( d3.easeLinear )
			.duration ( 1000 * duration )
			.attr ( "x2", this._into._pos.x )
			.attr ( "y2", this._into._pos.y )
			.end ()
			.catch ( () => this.animateOnForward () )
			.then ( () => this._into.powerOn () );
	}

	/**
	 * @name animateOnReverse
	 *
	 * @description Animate the wire in the reverse direction. When complete, automatically call
	 * {@link Junction.powerOn}() on {@link outof}.
	 *
	 * @returns {Promise<void>} The same promise produced by calling {@link Junction.powerOn}() on {@link outof}.
	 */
	animateOnReverse ()
	{
		/* If the animation speed is null, reject */
		if ( this._animationSpeed === null )
			return Promise.reject ();

		/* If the wire is fully live, power on the next junction immediately */
		if ( this._fullyLive )
			return this._outof.powerOn ();

		/* If the speed is Infinity, we don't want to perform any animation */
		if ( this._animationSpeed === Infinity )
		{
			/* Set the wire to be live */
			this._svgReverseLive
				.attr ( "x1", this._outof._pos.x )
				.attr ( "y1", this._outof._pos.y )
				.attr ( "visibility", "visible" );

			/* Power on the next junction */
			return this._outof.powerOn ();
		}

		/* Calculate the animation duration */
		const duration = ( ( 1 - this._reverseAnimationFrac ) * this._wireLength ) / this._animationSpeed;

		/* Start the animation. Catch any interrupts by restarting the animation.
		 * When complete, power on the next junction.
		 */
		return this._svgReverseLive
			.attr ( "visibility", "visible" )
			.transition ()
			.ease ( d3.easeLinear )
			.duration ( 1000 * duration )
			.attr ( "x1", this._outof._pos.x )
			.attr ( "y1", this._outof._pos.y )
			.end ()
			.catch ( () => this.animateOnReverse () )
			.then ( () => this._outof.powerOn () );
	}



	/**
	 * @name animateOffForward
	 *
	 * @description Animate the wire in the forward direction. When complete, automatically call
	 * {@link Junction.powerOff}() on {@link into}.
	 *
	 * @returns {Promise<void>} The same promise produced by calling {@link Junction.powerOff}() on {@link into}.
	 */
	animateOffForward ()
	{
		/* In the case that the wire is fully live, bring the end of the forward animation to the end of the reverse
		 * (so that there is no overlap of the live wires).
		 */
		if ( this._fullyLive )
			this._svgForwardLive
				.attr ( "x2", this._svgReverseLive.attr ( "x1" ) )
				.attr ( "y2", this._svgReverseLive.attr ( "y1" ) );

		/* Save the animation completion fraction */
		const animationFrac = this._forwardAnimationFrac;

		/* Calculate the animation duration */
		const duration = ( animationFrac * this._wireLength ) / Wire.POWER_OFF_ANIMATION_SPEED;

		/* Animate the back of the forward live line */
		return this._svgForwardLive
			.transition ()
			.ease ( d3.easeLinear )
			.duration ( 1000 * duration )
			.attr ( "x1", this._svgForwardLive.attr ( "x2" ) )
			.attr ( "y1", this._svgForwardLive.attr ( "y2" ) )
			.end ()
			.catch ( () => this.animateOffForward () )
			.finally ( () => this._svgForwardLive
				.attr ( "x1", this._outof.pos.x )
				.attr ( "y1", this._outof.pos.y )
				.attr ( "x2", this._outof.pos.x )
				.attr ( "y2", this._outof.pos.y )
				.attr ( "visibility", "hidden" ) )
			.then ( () =>
			{
				if ( animationFrac === 1 )
					return this._into.powerOff ();
			} );
	}

	/**
	 * @name animateOffReverse
	 *
	 * @description Animate the wire in the reverse direction. When complete, automatically call
	 * {@link Junction.powerOff}() on {@link outof}.
	 *
	 * @returns {Promise<void>} The same promise produced by calling {@link Junction.powerOff}() on {@link outof}.
	 */
	animateOffReverse ()
	{
		/* In the case that the wire is fully live, bring the end of the reverse animation to the end of the forward
		 * (so that there is no overlap of the live wires).
		 */
		if ( this._fullyLive )
			this._svgReverseLive
				.attr ( "x1", this._svgForwardLive.attr ( "x2" ) )
				.attr ( "y1", this._svgForwardLive.attr ( "y2" ) );

		/* Save the animation completion fraction */
		const animationFrac = this._reverseAnimationFrac;

		/* Calculate the animation duration */
		const duration = ( animationFrac * this._wireLength ) / Wire.POWER_OFF_ANIMATION_SPEED;

		/* Animate the back of the reverse live line */
		return this._svgReverseLive
			.transition ()
			.ease ( d3.easeLinear )
			.duration ( 1000 * duration )
			.attr ( "x2", this._svgReverseLive.attr ( "x1" ) )
			.attr ( "y2", this._svgReverseLive.attr ( "y1" ) )
			.end ()
			.catch ( () => this.animateOffReverse () )
			.finally ( () => this._svgReverseLive
				.attr ( "x1", this._into.pos.x )
				.attr ( "y1", this._into.pos.y )
				.attr ( "x2", this._into.pos.x )
				.attr ( "y2", this._into.pos.y )
				.attr ( "visibility", "hidden" ) )
			.then ( () =>
			{
				if ( animationFrac === 1 )
					return this._outof.powerOff ();
			} );
	}



	/**
	 * @name resetAnimation
	 *
	 * @description Reset the wire to its dead state.
	 */
	resetAnimation ()
	{
		this._svgForwardLive
			.attr ( "x1", this._outof._pos.x )
			.attr ( "y1", this._outof._pos.y )
			.attr ( "x2", this._outof._pos.x )
			.attr ( "y2", this._outof._pos.y )
			.attr ( "visibility", "hidden" );
		this._svgReverseLive
			.attr ( "x1", this._into._pos.x )
			.attr ( "y1", this._into._pos.y )
			.attr ( "x2", this._into._pos.x )
			.attr ( "y2", this._into._pos.y )
			.attr ( "visibility", "hidden" );
	}



	/**
	 * @private {Number} The length of the wire.
	 * @readonly
	 */
	get _wireLength ()
	{
		/* Pythagoras! */
		return Math.sqrt ( ( this._outof._pos.x - this._into._pos.x ) ** 2 + ( this._outof._pos.y - this._into._pos.y ) ** 2 );
	}

	/**
	 * @private {Number} The fraction complete of the forward animation.
	 * @readonly
	 */
	get _forwardAnimationFrac ()
	{
		/* Get the position of the forwards live line */
		const x = parseFloat ( this._svgForwardLive.attr ( "x2" ) );
		const y = parseFloat ( this._svgForwardLive.attr ( "y2" ) );

		/* Get the distance covered */
		const dist = Math.sqrt ( ( this._outof._pos.x - x ) ** 2 + ( this._outof._pos.y - y ) ** 2 );

		/* Return the fraction complete */
		return dist / this._wireLength;
	}

	/**
	 * @private {Number} The fraction complete of the reverse animation.
	 * @readonly
	 */
	get _reverseAnimationFrac ()
	{
		/* Get the position of the forwards live line */
		const x = parseFloat ( this._svgReverseLive.attr ( "x1" ) );
		const y = parseFloat ( this._svgReverseLive.attr ( "y1" ) );

		/* Get the distance covered */
		const dist = Math.sqrt ( ( this._into._pos.x - x ) ** 2 + ( this._into._pos.y - y ) ** 2 );

		/* Return the fraction complete */
		return dist / this._wireLength;
	}



	/**
	 * @private {Boolean} True iff the wire is fully live.
	 * @readonly
	 */
	get _fullyLive ()
	{
		return this._forwardAnimationFrac + this._reverseAnimationFrac >= 1.;
	}



	/**
	 * @name _updateOutofPosition
	 *
	 * @description Update the outof end of the wire's position.
	 */
	_updateOutofPosition ()
	{
		/* Update the line positions */
		this._svgDead
			.attr ( "x1", this._outof.pos.x )
			.attr ( "y1", this._outof.pos.y );
		this._svgForwardLive
			.attr ( "x1", this._outof.pos.x )
			.attr ( "y1", this._outof.pos.y );
		this._svgForwardLive
			.attr ( "x2", this._outof.pos.x )
			.attr ( "y2", this._outof.pos.y );
	}



	/**
	 * @name _updateIntoPosition
	 *
	 * @description Update the into end of the wire's position.
	 */
	_updateIntoPosition ()
	{
		/* Update the line positions */
		this._svgDead
			.attr ( "x2", this._into.pos.x )
			.attr ( "y2", this._into.pos.y );
		this._svgReverseLive
			.attr ( "x2", this._into.pos.x )
			.attr ( "y2", this._into.pos.y );
		this._svgReverseLive
			.attr ( "x1", this._into.pos.x )
			.attr ( "y1", this._into.pos.y );
	}



	/**
	 * @name destroy
	 *
	 * @description Destroy the wire, including the SVG elements it manages.
	 */
	destroy ()
	{
		/* Remove the svg elements */
		this._svgForwardLive.remove ();
		this._svgReverseLive.remove ();
		this._svgDead.remove ();

		/* Nullify outof and into (which is necessary to reconfigure incoming and outgoing of the connected junctions) */
		this.outof = null;
		this.into = null;
	}

}

