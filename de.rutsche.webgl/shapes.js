/*
 * WebGL / Javascript tutorial.
 * Author: Hartmut Schirmacher, hschirmacher.beuth-hochschule.de
 * (C)opyright 2011 by Hartmut Schirmacher, all rights reserved.
 *
 */

/*

 Class: VertexBasedShape
 The shape holds an array of vertices, and knows how to
 draw itself using WebGL.

 Parameters to the constructor:
 - program is the Program that these buffer objects shall be bound to
 - primitiveType is the geometric primitive to be used for drawing,
 e.g. gl.TRIANGLES, gl.LINES, gl.POINTS, gl.TRIANGLE_STRIP,
 gl.TRIANGLE_FAN
 - numVertices is the number of vertices this object consists of
 */
VertexBasedShape = function(gl, primitiveType, numVertices) {

	// arrays in which to store vertex buffers
	this.vertexBuffers = new Array();

	// optional element buffer containing indices
	this.elementBuffer = null;

	// remember what goemtric primitive to use for drawing
	this.primitiveType = primitiveType;

	// number of actual vertices
	this.numVertices = numVertices;

	// add a vertex attribute to the shape
	this.addVertexAttribute = function(gl, attrType, dataType, numElements, dataArray) {
		var buf = new VertexAttributeBuffer(gl, attrType, dataType, numElements, dataArray);
		this.vertexBuffers.push(buf);
		if(this.numVertices != buf.numVertices) {
			window.console.log("Warning: wrong number of vertices (" + buf.numVertices + " instead of " + this.numVertices + ") for attribute " + attrType);
		}
	}
	// add an element buffer object that contains indices into the
	// vertex attribute buffers
	this.addElementIndices = function(gl, indices) {
		this.elementBuffer = new ElementBuffer(gl, indices);
	}
	/*
	 Method: draw using a vertex buffer object
	 */
	this.draw = function(program) {

		// go through all types of vertex attributes
		// and enable them before drawing
		// for(var attribute=0; attribute<this.vertexBuffers.length; attribute++) {
		for( attribute = 0; attribute < this.vertexBuffers.length; attribute++) {
			this.vertexBuffers[attribute].makeActive(program);
		}

		// if we have an element buffer, use it as well
		if(this.elementBuffer != null) {
			this.elementBuffer.makeActive(program, true);
		}

		// perform the actual drawing of the primitive
		// using the vertex buffer object
		var n = this.elementBuffer ? this.elementBuffer.numElements : this.numVertices;
		//window.console.log("drawing shape with " + n + " vertices");
		program.gl.drawArrays(primitiveType, 0, n);

	}
}
/*

 Class:  Quad in point origin spanned by two vectors u and v.

 Parameters to the constructor:
 - program  [Program]  is the Program object to be used for rendering
 - o        [3 floats] is the origin of the quad
 - u, v     [3 floats] are orthogonal vectors spanning the quad

 */
Quad = function(gl, o, u, v) {

	// instantiate the shape as a member variable
	this.shape = new VertexBasedShape(gl, gl.TRIANGLES, 6);

	// vertex positions
	var vposition = new Float32Array([o[0], o[1], o[2], o[0] + u[0], o[1] + u[1], o[2] + u[2], o[0] + u[0] + v[0], o[1] + u[1] + v[1], o[2] + u[2] + v[2], o[0] + v[0], o[1] + v[1], o[2] + v[2], o[0], o[1], o[2], o[0] + u[0] + v[0], o[1] + u[1] + v[1], o[2] + u[2] + v[2]]);
	this.shape.addVertexAttribute(gl, "vertexPosition", gl.FLOAT, 3, vposition);

	// texture coords
	var vtexcoord = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1]);
	this.shape.addVertexAttribute(gl, "vertexTexCoord", gl.FLOAT, 2, vtexcoord);

	// vertex normals
	var norm = vec3.create();
	vec3.cross(u, v, norm);
	vec3.normalize(norm, norm);
	var vnormal = new Float32Array([norm[0], norm[1], norm[2], norm[0], norm[1], norm[2], norm[0], norm[1], norm[2], norm[0], norm[1], norm[2], norm[0], norm[1], norm[2], norm[0], norm[1], norm[2]]);
	this.shape.addVertexAttribute(gl, "vertexNormal", gl.FLOAT, 3, vnormal);

}
/*

 Object: GenerateParametricSurface

 This is basically a function generating vertex attribute buffers
 for the specified parametric surface object

 Parameters to the constructor:
 - gl: WebGL context
 - obj: object that defines position(), normal(), and texCoord()
 methods. These methods take (u,v) as input and output the
 desired attribute (3 floats or 2 floats).
 - M, N: generate MxN surface patches (times 2 triangles)
 - umin, umax: parameter domain for the u coordinate
 - vmin, vmax: parameter domain for the v coordinate
 - col1, col2: colors to be used for colorizing the patches
 in a checkerboard fashion

 Result:
 - obj will be added a new member "shape" of type VertexBasedShape
 - obj.shape will contain the specified vertex attribute buffers
 */
GenerateParametricSurface = function(gl, obj, M, N, umin, umax, vmin, vmax, col1, col2) {

	// remmeber the object to be used for calculating vertex attributes
	this.obj = obj;

	// instantiate the shape as a member variable of obj
	var numVertices = M * N * 6;
	this.obj.shape = new VertexBasedShape(gl, gl.TRIANGLES, numVertices);

	// arrays for the vertex positions and colors
	var vposition = new Float32Array(numVertices * 3);
	var vnormal = new Float32Array(numVertices * 3);
	var vcolor = new Float32Array(numVertices * 3);
	var vtexcoord = new Float32Array(numVertices * 2);

	// current index within the three arrays
	var pos_i = 0;
	var col_i = 0;
	var nor_i = 0;
	var tex_i = 0;

	// subroutine to set all values for a single vertex
	this.makeVertex = function(uu, vv, color) {

		// calculate and set texture coordinates
		if(this.obj.texCoord != undefined) {
			var tex = this.obj.texCoord(uu, vv);
			vtexcoord[tex_i++] = tex[0];
			vtexcoord[tex_i++] = tex[1];
		}

		// calculate and set vertex position
		if(this.obj.position != undefined) {
			var pos = this.obj.position(uu, vv);
			vposition[pos_i++] = pos[0];
			vposition[pos_i++] = pos[1];
			vposition[pos_i++] = pos[2];
		}

		// calculate and set vertex normal
		if(this.obj.normal != undefined) {
			var norm = this.obj.normal(uu, vv);
			vnormal[nor_i++] = norm[0];
			vnormal[nor_i++] = norm[1];
			vnormal[nor_i++] = norm[2];
		}

		// set vertex color
		if(color != undefined) {
			vcolor[col_i++] = color[0];
			vcolor[col_i++] = color[1];
			vcolor[col_i++] = color[2];
		}
	}
	// loop over the two surface parameters u and v
	for(var i = 1; i <= M; i++) {
		for(var j = 1; j <= N; j++) {

			// previous position (u0,v0) on the surface
			var u0 = umin + (i - 1.0) * (umax - umin) / M;
			var v0 = vmin + (j - 1.0) * (vmax - vmin) / N;

			// current position (u,v) on the surface
			var u = umin + i * (umax - umin) / M;
			var v = vmin + j * (vmax - vmin) / N;

			// colors shall alternate between col1 and col2
			var color = ((i + j) % 2 == 0) ? col1 : col2;

			// 1st triangle
			this.makeVertex(u0, v, color);
			this.makeVertex(u0, v0, color);
			this.makeVertex(u, v0, color);

			// 2nd triangle
			this.makeVertex(u, v, color);
			this.makeVertex(u0, v, color);
			this.makeVertex(u, v0, color);

		}
	}

	// create vertex buffer objects (VBOs)
	if(this.obj.position != undefined)
		this.obj.shape.addVertexAttribute(gl, "vertexPosition", gl.FLOAT, 3, vposition);

	if(this.obj.normal != undefined)
		this.obj.shape.addVertexAttribute(gl, "vertexNormal", gl.FLOAT, 3, vnormal);

	if(this.obj.texCoord != undefined)
		this.obj.shape.addVertexAttribute(gl, "vertexTexCoord", gl.FLOAT, 2, vtexcoord);

	if(col1 != undefined && col2 != undefined)
		this.obj.shape.addVertexAttribute(gl, "vertexColor", gl.FLOAT, 3, vcolor);

}
/*

 Object: Torus

 Defines position, normal, and some texture coordinates for a torus.
 Uses GenerateParaetricSurface to create the respective
 vertex attributes.

 */
Torus = function(gl, radius, radius2, N, M, col1, col2) {

	// remember radii so we can use them in position() and normal()
	this.radius = radius;
	this.radius2 = radius2;

	// define x/y/z coordinates for this torus
	this.position = function(t, p) {
		return [(this.radius + this.radius2 * Math.cos(p)) * Math.cos(t), (this.radius + this.radius2 * Math.cos(p)) * Math.sin(t), this.radius2 * Math.sin(p)];
	}
	// define normal directions for this torus
	this.normal = function(t, p) {
		h = 1.0;
		// this.radius2 * (this.radius2 * Math.cos(p) + this.radius);
		return [Math.cos(t) * Math.cos(p) * h, Math.sin(t) * Math.cos(p) * h, Math.sin(p) * h];
	}
	// define texture coordinates for this torus
	this.texCoord = function(u, v) {
		return [u / (2.0 * Math.PI), v / (2.0 * Math.PI)];

	}
	// call function to generate vertex attributes
	new GenerateParametricSurface(gl, this, M, N, 0, 2 * Math.PI, 0, 2 * Math.PI, col1, col2);

}
Sphere = function(gl, r, N, M, c1, c2) {

	// list for the verticies
	var vList = [];

	// list for the normals
	var nList = [];

	// list for the texture coordinates
	var tList = [];

	// list for the vertex colors
	var cList = [];

	// u and v coordinates
	var u, v, ui, vj;

	// vertex coordinates
	var x1, x2, x3, x4, y1, y2, y3, y4, z1, z2, z3, z4;

	//texture Coordinates
	var tx1, ty1, tx2, ty2, tx3, ty3, tx4, ty4;

	for(var i = 1; i <= N; i++) {
		for(var j = 1; j <= M; j++) {

			// calculate u and v
			u1 = Math.PI / N * i;
			v1 = Math.PI * 2 / M * j;
			u2 = Math.PI / N * (i - 1);
			v2 = Math.PI * 2 / M * (j - 1);

			// 2 triangles are made up of 4 points:
			// x coordinates
			x1 = (r * Math.sin(u1)) * Math.cos(v1);
			x2 = (r * Math.sin(u1)) * Math.cos(v2);
			x3 = (r * Math.sin(u2)) * Math.cos(v1);
			x4 = (r * Math.sin(u2)) * Math.cos(v2);

			// texture coordinates for x1-x4
			//tx1 = u1 / Math.PI;
			//tx2 = u1 / Math.PI;
			//tx3 = u2 / Math.PI;
			//tx4 = u2 / Math.PI;
			tx1 = u1 / Math.PI;
			tx2 = u1 / Math.PI;
			tx3 = u2 / Math.PI;
			tx4 = u2 / Math.PI;


			// y coordinates
			y1 = (r * Math.sin(u1)) * Math.sin(v1);
			y2 = (r * Math.sin(u1)) * Math.sin(v2);
			y3 = (r * Math.sin(u2)) * Math.sin(v1);
			y4 = (r * Math.sin(u2)) * Math.sin(v2);

			// texture coordinates for y1-y4
			//ty1 = v1 / (2.0 * Math.PI);
			//ty2 = v2 / (2.0 * Math.PI);
			//ty3 = v1 / (2.0 * Math.PI);
			//ty4 = v2 / (2.0 * Math.PI);
			ty1 = v1 / (2.0 * Math.PI);
			ty2 = v2 / (2.0 * Math.PI);
			ty3 = v1 / (2.0 * Math.PI);
			ty4 = v2 / (2.0 * Math.PI);


			// z coordinates
			z1 = r * Math.cos(u1);
			z2 = r * Math.cos(u1);
			z3 = r * Math.cos(u2);
			z4 = r * Math.cos(u2);

			// add the verticies to the list
			vList.push(x1, y1, z1, x3, y3, z3, x4, y4, z4, x1, y1, z1, x2, y2, z2, x4, y4, z4);

			// TODO calculate normals
			var v1, v2, v3, v4;
			v1 = vec3.normalize([x1, y1, z1]);
			v2 = vec3.normalize([x2, y2, z2]);
			v3 = vec3.normalize([x3, y3, z3]);
			v4 = vec3.normalize([x4, y4, z4]);

			nList.push(v1[0], v1[1], v1[2], v3[0], v3[1], v3[2], v4[0], v4[1], v4[2], v1[0], v1[1], v1[2], v2[0], v2[1], v2[2], v4[0], v4[1], v4[2]);

			// TODO calculate texture coordinates
			// tList.push(tx1, ty1, tx3, ty3, tx4, ty4, tx1, ty1, tx2, ty2, tx4, ty4);
			tList.push(ty1+0.25, -tx1, ty3+0.25, -tx3, ty4+0.25, -tx4, ty1+0.25, -tx1, ty2+0.25, -tx2, ty4+0.25, -tx4);

			for(var k = 0; k < 6; k++) {
				if(i % 2 + j % 2 == 1) {
					cList.push(c1[0]);
					cList.push(c1[1]);
					cList.push(c1[2]);
				} else {
					cList.push(c2[0]);
					cList.push(c2[1]);
					cList.push(c2[2]);
				}
			}
		}
	}
	// arrays for the vertex positions and colors
	var vnormal = new Float32Array(nList);
	var vtexcoord = new Float32Array(tList);
	var vposition = new Float32Array(vList);
	var vcolor = new Float32Array(cList);

	// instantiate the shape as a member variable
	this.shape = new VertexBasedShape(gl, gl.TRIANGLES, vposition.length / 3);
	this.shape.addVertexAttribute(gl, "vertexPosition", gl.FLOAT, 3, vposition);
	this.shape.addVertexAttribute(gl, "vertexColor", gl.FLOAT, 3, vcolor);
	this.shape.addVertexAttribute(gl, "vertexNormal", gl.FLOAT, 3, vnormal);
	this.shape.addVertexAttribute(gl, "vertexTexCoord", gl.FLOAT, 2, vtexcoord);
}