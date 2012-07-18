/**
 * @author Richard Rutsche
 */

/*
 * Object: World
 * Holds values for the world texture
 */
World = function(showLights, showClouds){
	
	this.showLights = showLights;
	this.showClouds = showClouds;
	
	// set all uniforms required to render this world
	this.setUniforms = function(){
		
		program.setUniform("world.showLights", "float", this.showLights);
		program.setUniform("world.showClouds", "float", this.showClouds);
	}
}
