import { Component, Element, Prop } from "@stencil/core";

import { PokeCheck, PokeCheckResultByZone } from '../../utils/interfaces';

import '@granite-elements/granite-alert/granite-alert';


@Component({
  tag: "poke-uptime-check-firefox",
  styleUrl: "poke-uptime-check-firefox.scss"
})
export class PokeUptimeCheck {

  @Element() el: HTMLElement;

  @Prop() domain: string;
  @Prop() check: PokeCheck;
  @Prop() zones: { [dynamic:string] : PokeCheckResultByZone }

  render() {
    console.log(`[poke-uptime-check] render called`, this.zones);
    return(
      <div class="poke-check">
        <div class="poke-check-description col-2">
          <div class='poke-check-dot'></div>
          <div class="poke-check-name">
            { this.check.name ? this.check.name : '' }
          </div>
          <div class="poke-check-url">
            {this.check.path}
          </div>    
          <div class="poke-check-type">
            { this.check.secure ? '(HTTPS)' : '(HTTP)' }
          </div>        
          <div><granite-alert>It works</granite-alert></div>
        </div>
      </div>
    );
  }
}
