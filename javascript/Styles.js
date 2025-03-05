/**
 * @class Styles
 *
 * @description An immutable class specifying styles for visual parts of the Bombe.
 */
class Styles
{
	/** @public {String} */
	liveColor;

	/** @public {String} */
	deadColor;

	/** @public {Number} */
	liveWidth;

	/** @public {Number} */
	deadWidth;

	/** @public {Number} */
	liveOpacity;

	/** @public {Number} */
	deadOpacity;

	/**
	 * @name constructor
	 *
	 * @param {String} liveColor
	 * @param {String} deadColor
	 * @param {Number} liveWidth
	 * @param {Number} deadWidth
	 * @param {Number} [liveOpacity = 1.]
	 * @param {Number} [deadOpacity = 1.]
	 */
	constructor ( liveColor, deadColor, liveWidth, deadWidth, liveOpacity = 1., deadOpacity = 1. )
	{
		this.liveColor = liveColor; this.deadColor = deadColor;
		this.liveWidth = liveWidth; this.deadWidth = deadWidth;
		this.liveOpacity = liveOpacity; this.deadOpacity = deadOpacity;
		Object.freeze ( this );
	}

	/**
	 * @name clone
	 *
	 * @returns {Styles} A clone of these styles.
	 */
	clone ()
	{
		return new Styles (
			this.liveColor,
			this.deadColor,
			this.liveWidth,
			this.deadWidth,
			this.liveOpacity,
			this.deadOpacity
		);
	}
}



/** @public {Styles} */
const HIDDEN_STYLES = new Styles ( "none", "none", 0., 0., 0., 0. );